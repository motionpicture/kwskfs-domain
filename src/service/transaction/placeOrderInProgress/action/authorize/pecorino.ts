/**
 * Pecorino承認アクションサービス
 * @namespace service.transaction.placeOrderInProgress.action.authorize.pecorino
 */

import * as factory from '@motionpicture/kwskfs-factory';
import * as pecorinoapi from '@motionpicture/pecorino-api-nodejs-client';
import * as createDebug from 'debug';
import * as moment from 'moment';

import { MongoRepository as ActionRepo } from '../../../../../repo/action';
import { MongoRepository as TransactionRepo } from '../../../../../repo/transaction';

const debug = createDebug('kwskfs-domain:service:transaction:placeOrderInProgress:action:authorize:pecorino');

export type ICreateOperation<T> = (repos: {
    action: ActionRepo;
    transaction: TransactionRepo;
    payTransactionService: pecorinoapi.service.transaction.Pay;
}) => Promise<T>;

/**
 * Pecorino残高差し押さえ
 */
export function create(
    __: string,
    transactionId: string,
    price: number
): ICreateOperation<factory.action.authorize.pecorino.IAction> {
    // tslint:disable-next-line:max-func-body-length
    return async (repos: {
        action: ActionRepo;
        transaction: TransactionRepo;
        payTransactionService: pecorinoapi.service.transaction.Pay;
    }) => {
        const transaction = await repos.transaction.findPlaceOrderInProgressById(transactionId);

        // 他者口座による決済も可能にするためにコメントアウト
        // 基本的に、自分の口座のオーソリを他者に与えても得しないので、
        // これが問題になるとすれば、本当にただサービスを荒らしたい悪質な攻撃のみ、ではある
        // if (transaction.agent.id !== agentId) {
        //     throw new factory.errors.Forbidden('A specified transaction is not yours.');
        // }

        // 承認アクションを開始する
        const actionAttributes = factory.action.authorize.pecorino.createAttributes({
            object: {
                typeOf: factory.action.authorize.pecorino.ObjectType.Pecorino,
                transactionId: transactionId,
                price: price
            },
            agent: transaction.agent,
            recipient: transaction.seller,
            purpose: transaction
        });
        const action = await repos.action.start<factory.action.authorize.pecorino.IAction>(actionAttributes);

        // Pecorinoオーソリ取得
        let pecorinoTransaction: any;
        try {
            debug('starting pecorino pay transaction...', price);
            pecorinoTransaction = await repos.payTransactionService.start({
                // tslint:disable-next-line:no-magic-numbers
                expires: moment().add(60, 'minutes').toDate(),
                recipient: {
                    typeOf: 'Person',
                    id: transaction.seller.id,
                    name: transaction.seller.name,
                    url: transaction.seller.url
                },
                price: price,
                notes: 'kwskfs-placeOrderTransaction'
            });
            debug('pecorinoTransaction started.', pecorinoTransaction.id);
        } catch (error) {
            // actionにエラー結果を追加
            try {
                // tslint:disable-next-line:max-line-length no-single-line-block-comment
                const actionError = (error instanceof Error) ? { ...error, ...{ message: error.message } } : /* istanbul ignore next */error;
                await repos.action.giveUp(action.typeOf, action.id, actionError);
            } catch (__) {
                // 失敗したら仕方ない
            }

            throw new Error(error);
        }

        // アクションを完了
        debug('ending authorize action...');

        const actionResult: factory.action.authorize.pecorino.IResult = {
            price: price,
            pecorinoTransaction: pecorinoTransaction,
            pecorinoEndpoint: repos.payTransactionService.options.endpoint
        };

        return repos.action.complete<factory.action.authorize.pecorino.IAction>(action.typeOf, action.id, actionResult);
    };
}

// tslint:disable-next-line:no-single-line-block-comment
/* istanbul ignore next */
export function cancel(
    agentId: string,
    transactionId: string,
    actionId: string
) {
    return async (__: {
        action: ActionRepo;
        transaction: TransactionRepo;
    }) => {
        debug('canceling pecorino authorize action...', agentId, transactionId, actionId);
        debug('implementing...');
    };
}
