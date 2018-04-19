/**
 * placeOrder transaction service
 * 注文取引サービス
 * @namespace service.transaction.placeOrder
 */

import * as factory from '@motionpicture/kwskfs-factory';
import * as createDebug from 'debug';
import * as json2csv from 'json2csv';

import { MongoRepository as TaskRepo } from '../../repo/task';
import { MongoRepository as TransactionRepo } from '../../repo/transaction';

const debug = createDebug('kwskfs-domain:service:transaction:placeOrder');

export type ITaskAndTransactionOperation<T> = (repos: {
    task: TaskRepo;
    transaction: TransactionRepo;
}) => Promise<T>;

/**
 * ひとつの取引のタスクをエクスポートする
 */
export function exportTasks(status: factory.transactionStatusType) {
    return async (repos: {
        task: TaskRepo;
        transaction: TransactionRepo;
    }) => {
        const statusesTasksExportable = [factory.transactionStatusType.Expired, factory.transactionStatusType.Confirmed];
        if (statusesTasksExportable.indexOf(status) < 0) {
            throw new factory.errors.Argument('status', `transaction status should be in [${statusesTasksExportable.join(',')}]`);
        }

        const transaction = await repos.transaction.startExportTasks(factory.transactionType.PlaceOrder, status);
        if (transaction === null) {
            return;
        }

        // 失敗してもここでは戻さない(RUNNINGのまま待機)
        await exportTasksById(transaction.id)(repos);

        await repos.transaction.setTasksExportedById(transaction.id);
    };
}

/**
 * ID指定で取引のタスク出力
 */
export function exportTasksById(transactionId: string): ITaskAndTransactionOperation<factory.task.ITask[]> {
    // tslint:disable-next-line:max-func-body-length
    return async (repos: {
        task: TaskRepo;
        transaction: TransactionRepo;
    }) => {
        const transaction = await repos.transaction.findPlaceOrderById(transactionId);

        const taskAttributes: factory.task.IAttributes[] = [];
        switch (transaction.status) {
            case factory.transactionStatusType.Confirmed:
                taskAttributes.push(factory.task.placeOrder.createAttributes({
                    status: factory.taskStatus.Ready,
                    runsAt: new Date(), // なるはやで実行
                    remainingNumberOfTries: 10,
                    lastTriedAt: null,
                    numberOfTried: 0,
                    executionResults: [],
                    data: {
                        transactionId: transaction.id
                    }
                }));

                break;

            // 期限切れの場合は、タスクリストを作成する
            case factory.transactionStatusType.Expired:
                taskAttributes.push(factory.task.cancelSeatReservation.createAttributes({
                    status: factory.taskStatus.Ready,
                    runsAt: new Date(), // なるはやで実行
                    remainingNumberOfTries: 10,
                    lastTriedAt: null,
                    numberOfTried: 0,
                    executionResults: [],
                    data: {
                        transactionId: transaction.id
                    }
                }));
                taskAttributes.push(factory.task.cancelCreditCard.createAttributes({
                    status: factory.taskStatus.Ready,
                    runsAt: new Date(), // なるはやで実行
                    remainingNumberOfTries: 10,
                    lastTriedAt: null,
                    numberOfTried: 0,
                    executionResults: [],
                    data: {
                        transactionId: transaction.id
                    }
                }));
                taskAttributes.push(factory.task.cancelMvtk.createAttributes({
                    status: factory.taskStatus.Ready,
                    runsAt: new Date(), // なるはやで実行
                    remainingNumberOfTries: 10,
                    lastTriedAt: null,
                    numberOfTried: 0,
                    executionResults: [],
                    data: {
                        transactionId: transaction.id
                    }
                }));

                break;

            default:
                throw new factory.errors.NotImplemented(`Transaction status "${transaction.status}" not implemented.`);
        }
        debug('taskAttributes prepared', taskAttributes);

        return Promise.all(taskAttributes.map(async (taskAttribute) => {
            return repos.task.save(taskAttribute);
        }));
    };
}

/**
 * 確定取引についてメールを送信する
 * @deprecated v24.0.0で廃止予定
 * @export
 * @param transactionId 取引ID
 * @param emailMessageAttributes Eメールメッセージ属性
 */
export function sendEmail(
    transactionId: string,
    emailMessageAttributes: factory.creativeWork.message.email.IAttributes
): ITaskAndTransactionOperation<factory.task.sendEmailMessage.ITask> {
    return async (repos: {
        task: TaskRepo;
        transaction: TransactionRepo;
    }) => {
        const transaction = await repos.transaction.findPlaceOrderById(transactionId);
        if (transaction.status !== factory.transactionStatusType.Confirmed) {
            throw new factory.errors.Forbidden('Transaction not confirmed.');
        }
        const transactionResult = transaction.result;
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore next */
        if (transactionResult === undefined) {
            throw new factory.errors.NotFound('transaction.result');
        }

        const emailMessage = factory.creativeWork.message.email.create({
            identifier: `placeOrderTransaction-${transactionId}`,
            sender: {
                typeOf: transaction.seller.typeOf,
                name: emailMessageAttributes.sender.name,
                email: emailMessageAttributes.sender.email
            },
            toRecipient: {
                typeOf: transaction.agent.typeOf,
                name: emailMessageAttributes.toRecipient.name,
                email: emailMessageAttributes.toRecipient.email
            },
            about: emailMessageAttributes.about,
            text: emailMessageAttributes.text
        });
        const actionAttributes = factory.action.transfer.send.message.email.createAttributes({
            actionStatus: factory.actionStatusType.ActiveActionStatus,
            object: emailMessage,
            agent: transaction.seller,
            recipient: transaction.agent,
            potentialActions: {},
            purpose: transactionResult.order
        });

        // その場で送信ではなく、DBにタスクを登録
        const taskAttributes = factory.task.sendEmailMessage.createAttributes({
            status: factory.taskStatus.Ready,
            runsAt: new Date(), // なるはやで実行
            remainingNumberOfTries: 10,
            lastTriedAt: null,
            numberOfTried: 0,
            executionResults: [],
            data: {
                actionAttributes: actionAttributes
            }
        });

        return <factory.task.sendEmailMessage.ITask>await repos.task.save(taskAttributes);
    };
}

/**
 * フォーマット指定でダウンロード
 * @export
 * @param conditions 検索条件
 * @param format フォーマット
 */
export function download(
    conditions: {
        startFrom: Date;
        startThrough: Date;
    },
    format: 'csv'
) {
    return async (repos: { transaction: TransactionRepo }): Promise<string> => {
        // 取引検索
        const transactions = await repos.transaction.searchPlaceOrder(conditions);
        debug('transactions:', transactions);

        // 取引ごとに詳細を検索し、csvを作成する
        const data = await Promise.all(transactions.map(async (transaction) => transaction2report(transaction)));
        debug('data:', data);

        if (format === 'csv') {
            return new Promise<string>((resolve) => {
                const fields = [
                    'id', 'status', 'startDate', 'endDate',
                    'customer.name', 'customer.email', 'customer.telephone', 'customer.memberOf.membershipNumber',
                    'eventName', 'eventStartDate', 'eventEndDate', 'superEventLocationBranchCode', 'superEventLocation', 'eventLocation',
                    'reservedTickets', 'orderNumber', 'confirmationNumber', 'price',
                    'paymentMethod.0', 'paymentMethodId.0',
                    'paymentMethod.1', 'paymentMethodId.1',
                    'paymentMethod.2', 'paymentMethodId.2',
                    'paymentMethod.3', 'paymentMethodId.3',
                    'discounts.0', 'discountCodes.0', 'discountPrices.0',
                    'discounts.1', 'discountCodes.1', 'discountPrices.1',
                    'discounts.2', 'discountCodes.2', 'discountPrices.2',
                    'discounts.3', 'discountCodes.3', 'discountPrices.3'
                ];
                const fieldNames = [
                    '取引ID', '取引ステータス', '開始日時', '終了日時',
                    'お名前', 'メールアドレス', '電話番号', '会員ID',
                    'イベント名', 'イベント開始日時', 'イベント終了日時', '劇場コード', '劇場名', 'スクリーン名',
                    '予約座席チケット', '注文番号', '確認番号', '金額',
                    '決済方法1', '決済ID1', '決済方法2', '決済ID2', '決済方法3', '決済ID3', '決済方法4', '決済ID4',
                    '割引1', '割引コード1', '割引金額1', '割引2', '割引コード2', '割引金額2', '割引3', '割引コード3', '割引金額3', '割引4', '割引コード4', '割引金額4'
                ];
                const output = json2csv(<any>{
                    data: data,
                    fields: fields,
                    fieldNames: fieldNames,
                    del: ',',
                    newLine: '\n',
                    flatten: true,
                    preserveNewLinesInValues: true
                });
                debug('output:', output);

                resolve(output);
                // resolve(jconv.convert(output, 'UTF8', 'SJIS'));
            });
        } else {
            throw new factory.errors.NotImplemented('specified format not implemented.');
        }
    };
}

/**
 * 取引レポートインターフェース
 * @export
 */
export interface ITransactionReport {
    id: string;
    status: string;
    startDate: string;
    endDate: string;
    customer: {
        name: string;
        email: string;
        telephone: string;
        memberOf?: {
            membershipNumber: string;
        };
    };
    eventName: string;
    eventStartDate: string;
    eventEndDate: string;
    superEventLocationBranchCode: string;
    superEventLocation: string;
    eventLocation: string;
    reservedTickets: string;
    orderNumber: string;
    confirmationNumber: string;
    price: string;
    paymentMethod: string[];
    paymentMethodId: string[];
    discounts: string[];
    discountCodes: string[];
    discountPrices: string[];
}

export function transaction2report(transaction: factory.transaction.placeOrder.ITransaction): ITransactionReport {
    if (transaction.result !== undefined) {
        const order = transaction.result.order;
        const orderItems = order.acceptedOffers;
        const screeningEvent = orderItems[0].itemOffered.reservationFor;
        const ticketsStr = orderItems.map(
            // tslint:disable-next-line:max-line-length
            (orderItem) => `${orderItem.itemOffered.reservedTicket.ticketedSeat.seatNumber} ${orderItem.itemOffered.reservedTicket.coaTicketInfo.ticketName} ￥${orderItem.itemOffered.reservedTicket.coaTicketInfo.salePrice}`
        ).join('\n');

        return {
            id: transaction.id,
            status: transaction.status,
            startDate: (transaction.startDate !== undefined) ? transaction.startDate.toISOString() : '',
            endDate: (transaction.endDate !== undefined) ? transaction.endDate.toISOString() : '',
            customer: order.customer,
            eventName: screeningEvent.superEvent.workPerformed.name,
            eventStartDate: screeningEvent.startDate.toISOString(),
            eventEndDate: screeningEvent.endDate.toISOString(),
            superEventLocationBranchCode: `${screeningEvent.superEvent.location.branchCode}`,
            superEventLocation: screeningEvent.superEvent.location.name.ja,
            eventLocation: screeningEvent.location.name.ja,
            reservedTickets: ticketsStr,
            orderNumber: order.orderNumber,
            confirmationNumber: order.confirmationNumber.toString(),
            price: `${order.price} ${order.priceCurrency}`,
            paymentMethod: order.paymentMethods.map((method) => method.name),
            paymentMethodId: order.paymentMethods.map((method) => method.paymentMethodId),
            discounts: order.discounts.map((discount) => discount.name),
            discountCodes: order.discounts.map((discount) => discount.discountCode),
            discountPrices: order.discounts.map((discount) => `${discount.discount} ${discount.discountCurrency}`)
        };
    } else {
        const customerContact = transaction.object.customerContact;

        return {
            id: transaction.id,
            status: transaction.status,
            startDate: (transaction.startDate !== undefined) ? transaction.startDate.toISOString() : '',
            endDate: (transaction.endDate !== undefined) ? transaction.endDate.toISOString() : '',
            customer: {
                name: (customerContact !== undefined) ? `${customerContact.familyName} ${customerContact.givenName}` : '',
                email: (customerContact !== undefined) ? customerContact.email : '',
                telephone: (customerContact !== undefined) ? customerContact.telephone : '',
                memberOf: {
                    membershipNumber: (transaction.agent.memberOf !== undefined) ? transaction.agent.memberOf.membershipNumber : ''
                }
            },
            eventName: '',
            eventStartDate: '',
            eventEndDate: '',
            superEventLocationBranchCode: '',
            superEventLocation: '',
            eventLocation: '',
            reservedTickets: '',
            orderNumber: '',
            confirmationNumber: '',
            price: '',
            paymentMethod: [],
            paymentMethodId: [],
            discounts: [],
            discountCodes: [],
            discountPrices: []
        };
    }
}
