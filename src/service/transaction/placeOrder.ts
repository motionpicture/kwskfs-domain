/**
 * 注文取引サービス
 */
import * as factory from '@motionpicture/kwskfs-factory';
import * as createDebug from 'debug';
import * as json2csv from 'json2csv';

import { MongoRepository as ActionRepo } from '../../repo/action';
import { MongoRepository as OrderRepo } from '../../repo/order';
import { MongoRepository as OwnershipInfoRepo } from '../../repo/ownershipInfo';
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

/**
 * 取引ダウンロードフォーマット
 */
export type IDownloadFormat = 'csv';

/**
 * フォーマット指定でダウンロード
 * @param conditions 検索条件
 * @param format フォーマット
 */
// tslint:disable-next-line:max-func-body-length
export function download(
    conditions: {
        startFrom: Date;
        startThrough: Date;
    },
    format: IDownloadFormat
) {
    // tslint:disable-next-line:max-func-body-length
    return async (repos: {
        action: ActionRepo;
        order: OrderRepo;
        ownershipInfo: OwnershipInfoRepo;
        transaction: TransactionRepo;
    }): Promise<string> => {
        // 取引検索
        const transactions = await repos.transaction.searchPlaceOrder(conditions);
        debug('transactions:', transactions);

        // 確定取引の注文データ現状を取得する
        const orderNumbers = transactions.filter((t) => t.status === factory.transactionStatusType.Confirmed)
            .map((t) => (<factory.transaction.placeOrder.IResult>t.result).order.orderNumber);
        const orders = <factory.order.IOrder[]>await repos.order.orderModel.find({
            orderNumber: { $in: orderNumbers }
        }).exec().then((docs) => docs.map((doc) => doc.toObject()));

        // 所有権検索
        const ownershipInfoIdentifiers = transactions.filter((t) => t.status === factory.transactionStatusType.Confirmed)
            .reduce(
                (a, b) => [...a, ...(<factory.transaction.placeOrder.IResult>b.result).ownershipInfos.map((o) => o.identifier)],
                []
            );
        const ownershipInfos = await repos.ownershipInfo.ownershipInfoModel.find({
            identifier: { $in: ownershipInfoIdentifiers }
        }).exec().then((docs) => docs.map(
            (doc) => <factory.ownershipInfo.IOwnershipInfo<factory.reservationType.EventReservation>>doc.toObject()
        ));
        debug(ownershipInfos.length, 'ownershipInfos found.');

        // チェックインアクション検索
        const ticketTokens = transactions.filter((t) => t.status === factory.transactionStatusType.Confirmed)
            .reduce(
                (a, b) => [
                    ...a,
                    ...(<factory.transaction.placeOrder.IResult>b.result).ownershipInfos.map((o) => o.typeOfGood.reservedTicket.ticketToken)
                ],
                []
            );
        const actions = await repos.action.actionModel.find({
            typeOf: factory.actionType.CheckInAction,
            'object.reservedTicket.ticketToken': {
                $exists: true,
                $in: ticketTokens
            }
        }).exec().then((docs) => docs.map((doc) => doc.toObject()));

        // 取引ごとに詳細を検索し、csvを作成する
        const data = await Promise.all(transactions.map(async (t) => {
            if (t.status === factory.transactionStatusType.Confirmed) {
                const orderNumber = (<factory.transaction.placeOrder.IResult>t.result).order.orderNumber;
                const ownershipInfoIds = (<factory.transaction.placeOrder.IResult>t.result).ownershipInfos.map((o) => o.identifier);
                const ticketTokens4transaction = (<factory.transaction.placeOrder.IResult>t.result).ownershipInfos.map(
                    (o) => o.typeOfGood.reservedTicket.ticketToken
                );

                return transaction2report({
                    order: orders.find((o) => o.orderNumber === orderNumber),
                    ownershipInfos: ownershipInfos.filter((i) => ownershipInfoIds.indexOf(i.identifier) >= 0),
                    checkinActions: actions.filter((a) => ticketTokens4transaction.indexOf(a.object.reservedTicket.ticketToken) >= 0),
                    transaction: t
                });
            } else {
                return transaction2report({
                    transaction: t
                });
            }
        }));
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
                    { label: '予約チケットトークン', default: '', value: 'reservedTickets.ticketToken' },
                    { label: '予約チケット金額', default: '', value: 'reservedTickets.totalPrice' },
                    { label: '予約チケットアイテム', default: '', value: 'reservedTickets.name' },
                    { label: '予約チケットアイテム数', default: '', value: 'reservedTickets.numItems' },
                    { label: '注文番号', default: '', value: 'orderNumber' },
                    { label: '確認番号', default: '', value: 'confirmationNumber' },
                    { label: '注文金額', default: '', value: 'price' },
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
                    { label: '割引金額4', default: '', value: 'discountPrices.3' },
                    { label: '注文状況', default: '', value: 'orderStatus' },
                    { label: '予約チケットステータス', default: '', value: 'reservedTickets.reservationStatus' },
                    { label: '予約チケットチェックイン数', default: '', value: 'reservedTickets.numCheckInActions' }
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
        reservationStatus: string;
        numCheckInActions: number;
    }[];
    orderNumber: string;
    orderStatus: string;
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
// tslint:disable-next-line:max-func-body-length
export function transaction2report(params: {
    order?: factory.order.IOrder;
    ownershipInfos?: factory.ownershipInfo.IOwnershipInfo<factory.reservationType.EventReservation>[];
    checkinActions?: factory.action.IAction<factory.action.IAttributes<any, any>>[];
    transaction: factory.transaction.placeOrder.ITransaction;
}): ITransactionReport {
    if (params.transaction.result !== undefined) {
        // 注文データがまだ存在しなければ取引結果から参照
        const order = (params.order !== undefined) ? params.order : params.transaction.result.order;
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

                let reservationStatus = '';
                if (params.ownershipInfos !== undefined) {
                    const ownershipInfo = params.ownershipInfos.find((i) => i.typeOfGood.reservedTicket.ticketToken === ticket.ticketToken);
                    if (ownershipInfo !== undefined) {
                        reservationStatus = ownershipInfo.typeOfGood.reservationStatus;
                    }
                }
                let numCheckInActions = 0;
                if (params.checkinActions !== undefined) {
                    numCheckInActions = params.checkinActions.filter(
                        (a) => a.object.reservedTicket.ticketToken === ticket.ticketToken
                    ).length;
                }

                return {
                    ticketToken: ticket.ticketToken,
                    totalPrice: ticket.totalPrice,
                    name: name,
                    numItems: numItems,
                    reservationStatus: reservationStatus,
                    numCheckInActions: numCheckInActions
                };
            }
        );

        return {
            id: params.transaction.id,
            status: params.transaction.status,
            startDate: (params.transaction.startDate !== undefined) ? params.transaction.startDate.toISOString() : '',
            endDate: (params.transaction.endDate !== undefined) ? params.transaction.endDate.toISOString() : '',
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
            orderStatus: order.orderStatus,
            confirmationNumber: order.confirmationNumber.toString(),
            price: `${order.price} ${order.priceCurrency}`,
            paymentMethod: order.paymentMethods.map((method) => method.name),
            paymentMethodId: order.paymentMethods.map((method) => method.paymentMethodId),
            discounts: order.discounts.map((discount) => discount.name),
            discountCodes: order.discounts.map((discount) => discount.discountCode),
            discountPrices: order.discounts.map((discount) => `${discount.discount} ${discount.discountCurrency}`)
        };
    } else {
        const customerContact = params.transaction.object.customerContact;

        return {
            id: params.transaction.id,
            status: params.transaction.status,
            startDate: (params.transaction.startDate !== undefined) ? params.transaction.startDate.toISOString() : '',
            endDate: (params.transaction.endDate !== undefined) ? params.transaction.endDate.toISOString() : '',
            seller: params.transaction.seller,
            customer: {
                name: (customerContact !== undefined) ? `${customerContact.familyName} ${customerContact.givenName}` : '',
                email: (customerContact !== undefined) ? customerContact.email : '',
                telephone: (customerContact !== undefined) ? customerContact.telephone : '',
                memberOf: {
                    membershipNumber: (params.transaction.agent.memberOf !== undefined) ?
                        params.transaction.agent.memberOf.membershipNumber :
                        ''
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
            orderStatus: '',
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
