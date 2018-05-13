/**
 * 注文取引サービス
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
        const transaction = await repos.transaction.findById(factory.transactionType.PlaceOrder, transactionId);

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
            case factory.transactionStatusType.Canceled:
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
                taskAttributes.push(factory.task.cancelPecorino.createAttributes({
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

        return Promise.all(taskAttributes.map(async (a) => repos.task.save(a)));
    };
}

export type IDownloadFormat = 'csv';

/**
 * フォーマット指定でダウンロード
 * @param conditions 検索条件
 * @param format フォーマット
 */
export function download(
    conditions: {
        startFrom: Date;
        startThrough: Date;
    },
    format: IDownloadFormat
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
                const fields: json2csv.json2csv.FieldInfo<any>[] = [
                    { label: '取引ID', default: '', value: 'id' },
                    { label: '取引ステータス', default: '', value: 'status' },
                    { label: '取引開始日時', default: '', value: 'startDate' },
                    { label: '取引終了日時', default: '', value: 'endDate' },
                    { label: '購入者お名前', default: '', value: 'customer.name' },
                    { label: '購入者メールアドレス', default: '', value: 'customer.email' },
                    { label: '購入者電話番号', default: '', value: 'customer.telephone' },
                    { label: '購入者ID', default: '', value: 'customer.memberOf.membershipNumber' },
                    { label: '販売者タイプ', default: '', value: 'seller.typeOf' },
                    { label: '販売者ID', default: '', value: 'seller.id' },
                    { label: '販売者名', default: '', value: 'seller.name' },
                    { label: '販売者URL', default: '', value: 'seller.url' },
                    { label: '予約イベント名', default: '', value: 'eventName' },
                    { label: '予約イベント開始日時', default: '', value: 'eventStartDate' },
                    { label: '予約イベント終了日時', default: '', value: 'eventEndDate' },
                    { label: '予約イベント場所枝番号', default: '', value: 'superEventLocationBranchCode' },
                    { label: '予約イベント場所1', default: '', value: 'superEventLocation' },
                    { label: '予約イベント場所2', default: '', value: 'eventLocation' },
                    { label: 'チケットトークン', default: '', value: 'reservedTickets.ticketToken' },
                    { label: 'チケット金額', default: '', value: 'reservedTickets.totalPrice' },
                    { label: 'チケットアイテム', default: '', value: 'reservedTickets.name' },
                    { label: 'アイテム数', default: '', value: 'reservedTickets.numItems' },
                    { label: '注文番号', default: '', value: 'orderNumber' },
                    { label: '確認番号', default: '', value: 'confirmationNumber' },
                    { label: '金額', default: '', value: 'price' },
                    { label: '決済方法1', default: '', value: 'paymentMethod.0' },
                    { label: '決済ID1', default: '', value: 'paymentMethodId.0' },
                    { label: '決済方法2', default: '', value: 'paymentMethod.1' },
                    { label: '決済ID2', default: '', value: 'paymentMethodId.1' },
                    { label: '決済方法3', default: '', value: 'paymentMethod.2' },
                    { label: '決済ID3', default: '', value: 'paymentMethodId.2' },
                    { label: '決済方法4', default: '', value: 'paymentMethod.3' },
                    { label: '決済ID4', default: '', value: 'paymentMethodId.3' },
                    { label: '割引1', default: '', value: 'discounts.0' },
                    { label: '割引コード1', default: '', value: 'discountCodes.0' },
                    { label: '割引金額1', default: '', value: 'discountPrices.0' },
                    { label: '割引2', default: '', value: 'discounts.1' },
                    { label: '割引コード2', default: '', value: 'discountCodes.1' },
                    { label: '割引金額2', default: '', value: 'discountPrices.1' },
                    { label: '割引3', default: '', value: 'discounts.2' },
                    { label: '割引コード3', default: '', value: 'discountCodes.2' },
                    { label: '割引金額3', default: '', value: 'discountPrices.2' },
                    { label: '割引4', default: '', value: 'discounts.3' },
                    { label: '割引コード4', default: '', value: 'discountCodes.3' },
                    { label: '割引金額4', default: '', value: 'discountPrices.3' }
                ];
                const json2csvParser = new json2csv.Parser({
                    fields: fields,
                    delimiter: ',',
                    eol: '\n',
                    // flatten: true,
                    // preserveNewLinesInValues: true,
                    unwind: 'reservedTickets'
                });
                const output = json2csvParser.parse(data);
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
 */
export interface ITransactionReport {
    id: string;
    status: string;
    startDate: string;
    endDate: string;
    seller: {
        typeOf: string;
        id: string;
        name: string;
        url: string;
    };
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
    reservedTickets: {
        ticketToken: string;
        totalPrice: number;
        name: string;
        numItems: number;
    }[];
    orderNumber: string;
    confirmationNumber: string;
    price: string;
    paymentMethod: string[];
    paymentMethodId: string[];
    discounts: string[];
    discountCodes: string[];
    discountPrices: string[];
}

/**
 * 注文取引をレポート形式に変換する
 * @param transaction 注文取引オブジェクト
 */
export function transaction2report(transaction: factory.transaction.placeOrder.ITransaction): ITransactionReport {
    if (transaction.result !== undefined) {
        const order = transaction.result.order;
        const orderItems = order.acceptedOffers;
        const event = orderItems[0].itemOffered.reservationFor;
        const tickets = orderItems.map(
            (orderItem) => {
                const offer = orderItem.itemOffered;
                const ticket = offer.reservedTicket;
                const ticketedSeat = ticket.ticketedSeat;
                const ticketedMenuItem = ticket.ticketedMenuItem;
                let name = '';
                let numItems = 1;
                if (ticketedSeat !== undefined) {
                    // tslint:disable-next-line:max-line-length
                    name = ` ${ticketedSeat.seatNumber}`;
                }
                if (ticketedMenuItem !== undefined) {
                    // tslint:disable-next-line:max-line-length
                    name = ` ${ticketedMenuItem.name}`;
                }
                if (offer.numSeats !== undefined) {
                    // tslint:disable-next-line:max-line-length
                    numItems = offer.numSeats;
                }
                if (offer.numMenuItems !== undefined) {
                    // tslint:disable-next-line:max-line-length
                    numItems = offer.numMenuItems;
                }

                return {
                    ticketToken: ticket.ticketToken,
                    totalPrice: ticket.totalPrice,
                    name: name,
                    numItems: numItems
                };
            }
        );

        return {
            id: transaction.id,
            status: transaction.status,
            startDate: (transaction.startDate !== undefined) ? transaction.startDate.toISOString() : '',
            endDate: (transaction.endDate !== undefined) ? transaction.endDate.toISOString() : '',
            seller: order.seller,
            customer: order.customer,
            eventName: (event.name !== undefined) ? event.name.ja : '',
            eventStartDate: (event.startDate !== undefined) ? event.startDate.toISOString() : '',
            eventEndDate: (event.endDate !== undefined) ? event.endDate.toISOString() : '',
            superEventLocationBranchCode: '',
            superEventLocation: '',
            eventLocation: (event.location !== undefined && event.location.name !== undefined) ? event.location.name.ja : '',
            reservedTickets: tickets,
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
            seller: transaction.seller,
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
            reservedTickets: [],
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
