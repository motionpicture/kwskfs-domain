/**
 * 座席予約承認アクションサービス
 */

import * as factory from '@motionpicture/kwskfs-factory';
import * as createDebug from 'debug';

import { MongoRepository as ActionRepo } from '../../../../../../../repo/action';
import { MongoRepository as EventRepo } from '../../../../../../../repo/event';
import { MongoRepository as TransactionRepo } from '../../../../../../../repo/transaction';

const debug = createDebug('kwskfs-domain:service:transaction:placeOrderInProgress:action:authorize:offer:eventReservation:seat');

export type ICreateOperation<T> = (repos: {
    event: EventRepo;
    action: ActionRepo;
    transaction: TransactionRepo;
}) => Promise<T>;

/**
 * 座席予約に対する承認アクションを開始する前の処理
 * 供給情報の有効性の確認などを行う。
 */
// async function validateOffers(): Promise<factory.offer.eventReservation.seat.IOffer[]> {
//     return offersWithDetails;
// }

/**
 * 座席を仮予約する
 * 承認アクションオブジェクトが返却されます。
 */
export function create(params: {
    agentId: string;
    transactionId: string;
    eventType: factory.eventType;
    eventIdentifier: string;
    offerIdentifier: string;
    seatSection: string;
    seatNumber: string;
}): ICreateOperation<factory.action.authorize.offer.eventReservation.seat.IAction> {
    // tslint:disable-next-line:max-func-body-length
    return async (repos: {
        event: EventRepo;
        action: ActionRepo;
        transaction: TransactionRepo;
    }) => {
        const transaction = await repos.transaction.findInProgressById(factory.transactionType.PlaceOrder, params.transactionId);

        if (transaction.agent.id !== params.agentId) {
            throw new factory.errors.Forbidden('A specified transaction is not yours.');
        }

        // イベントを取得
        const event = await repos.event.findByIdentifier(params.eventType, params.eventIdentifier);

        // 供給情報の有効性を確認
        // const offersWithDetails = await validateOffers((transaction.agent.memberOf !== undefined), event, offers);

        // 承認アクションを開始
        const underName = {
            typeOf: factory.personType.Person,
            name: {
                ja: '',
                en: ''
            }
        };
        const issuedBy = {
            typeOf: transaction.seller.typeOf,
            name: {
                ja: transaction.seller.name,
                en: transaction.seller.name
            }
        };
        const price = 1000;
        const offer: factory.action.authorize.offer.eventReservation.seat.IObject = {
            typeOf: 'Offer',
            price: price,
            priceCurrency: factory.priceCurrency.JPY,
            itemOffered: {
                typeOf: factory.reservationType.EventReservation,
                additionalTicketText: '',
                modifiedTime: new Date(),
                numSeats: 1,
                price: price,
                priceCurrency: factory.priceCurrency.JPY,
                // programMembershipUsed: true,
                reservationFor: event,
                reservationNumber: 'reservationNumber',
                reservationStatus: factory.reservationStatusType.ReservationHold,
                reservedTicket: {
                    typeOf: 'Ticket',
                    dateIssued: new Date(),
                    issuedBy: issuedBy,
                    totalPrice: price,
                    priceCurrency: factory.priceCurrency.JPY,
                    ticketedSeat: {
                        typeOf: factory.placeType.Seat,
                        seatingType: '',
                        seatNumber: params.seatNumber,
                        seatRow: '',
                        seatSection: params.seatSection
                    },
                    ticketNumber: '',
                    ticketToken: '',
                    underName: underName
                },
                underName: underName
            }
        };
        const actionAttributes: factory.action.authorize.offer.eventReservation.seat.IAttributes = {
            typeOf: factory.actionType.AuthorizeAction,
            agent: transaction.seller,
            recipient: transaction.agent,
            object: offer,
            purpose: transaction
        };
        const action = await repos.action.start<factory.action.authorize.offer.eventReservation.seat.IAction>(actionAttributes);

        try {
            // 在庫確認
        } catch (error) {
            // actionにエラー結果を追加
            try {
                const actionError = (error instanceof Error) ? { ...error, ...{ message: error.message } } : error;
                await repos.action.giveUp(action.typeOf, action.id, actionError);
            } catch (__) {
                // 失敗したら仕方ない
            }

            throw new factory.errors.ServiceUnavailable('Unexepected error occurred.');
        }

        // アクションを完了
        debug('ending authorize action...');
        const result: factory.action.authorize.offer.eventReservation.seat.IResult = {
            price: offer.price,
            priceCurrency: offer.priceCurrency
        };

        return repos.action.complete<factory.action.authorize.offer.eventReservation.seat.IAction>(action.typeOf, action.id, result);
    };
}

/**
 * 座席予約承認アクションをキャンセルする
 * @param agentId アクション主体ID
 * @param transactionId 取引ID
 * @param actionId アクションID
 */
export function cancel(
    agentId: string,
    transactionId: string,
    actionId: string
) {
    return async (repos: {
        action: ActionRepo;
        transaction: TransactionRepo;
    }) => {
        const transaction = await repos.transaction.findInProgressById(factory.transactionType.PlaceOrder, transactionId);

        if (transaction.agent.id !== agentId) {
            throw new factory.errors.Forbidden('A specified transaction is not yours.');
        }

        const action = await repos.action.cancel(factory.actionType.AuthorizeAction, actionId);
        debug('action canceld.', action.id);
        // const actionResult = <factory.action.authorize.offer.eventReservation.seat.IResult>action.result;
    };
}
