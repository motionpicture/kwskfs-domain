/**
 * 在庫管理(在庫数調整)サービス
 */

import * as factory from '@motionpicture/kwskfs-factory';
import * as createDebug from 'debug';

import { MongoRepository as ActionRepo } from '../repo/action';

const debug = createDebug('kwskfs-domain:service:stock');

export type IPlaceOrderTransaction = factory.transaction.placeOrder.ITransaction;

/**
 * 資産承認解除(座席予約)
 * @param transactionId 取引ID
 */
export function cancelSeatReservationAuth(transactionId: string) {
    return async (repos: { action: ActionRepo }) => {
        // 座席仮予約アクションを取得
        const authorizeActions = await repos.action.findAuthorizeByTransactionId(transactionId)
            .then((actions) => (<factory.action.authorize.offer.eventReservation.seat.IAction[]>actions)
                .filter((a) => a.actionStatus === factory.actionStatusType.CompletedActionStatus)
                .filter((a) => a.object.typeOf === 'Offer')
                .filter((a) => a.object.itemOffered.reservedTicket.ticketedSeat !== undefined)
            );

        debug('canceling temporary seat reservation...', authorizeActions);
    };
}
