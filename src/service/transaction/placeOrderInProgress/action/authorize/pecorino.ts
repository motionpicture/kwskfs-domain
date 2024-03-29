/**
 * Pecorino承認アクションサービス
 */

import * as factory from '@motionpicture/kwskfs-factory';
import * as pecorinoapi from '@motionpicture/pecorino-api-nodejs-client';
import * as createDebug from 'debug';
import { BAD_REQUEST, FORBIDDEN, NOT_FOUND, TOO_MANY_REQUESTS, UNAUTHORIZED } from 'http-status';
import * as moment from 'moment';

import { MongoRepository as ActionRepo } from '../../../../../repo/action';
import { MongoRepository as OrganizationRepo } from '../../../../../repo/organization';
import { MongoRepository as TransactionRepo } from '../../../../../repo/transaction';

const debug = createDebug('kwskfs-domain:service:transaction:placeOrderInProgress:action:authorize:pecorino');

export type ICreateOperation<T> = (repos: {
    action: ActionRepo;
    organization: OrganizationRepo;
    transaction: TransactionRepo;
    payTransactionService?: pecorinoapi.service.transaction.Pay;
    transferTransactionService?: pecorinoapi.service.transaction.Transfer;
}) => Promise<T>;

/**
 * Pecorino残高差し押さえ
 * 口座取引は、支払取引あるいは転送取引のどちらかを選択できます。
 */
export function create(params: {
    /**
     * 取引ID
     */
    transactionId: string;
    /**
     * 金額
     */
    price: number;
    /**
     * Pecorino口座ID
     */
    fromAccountNumber: string;
    /**
     * 支払取引メモ
     */
    notes?: string;
}): ICreateOperation<factory.action.authorize.pecorino.IAction> {
    // tslint:disable-next-line:max-func-body-length
    return async (repos: {
        action: ActionRepo;
        organization: OrganizationRepo;
        transaction: TransactionRepo;
        /**
         * 支払取引サービス
         */
        payTransactionService?: pecorinoapi.service.transaction.Pay;
        /**
         * 転送取引サービス
         */
        transferTransactionService?: pecorinoapi.service.transaction.Transfer;
    }) => {
        const transaction = await repos.transaction.findInProgressById(factory.transactionType.PlaceOrder, params.transactionId);

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
                transactionId: params.transactionId,
                price: params.price
            },
            agent: transaction.agent,
            recipient: transaction.seller,
            purpose: transaction
        });
        const action = await repos.action.start<factory.action.authorize.pecorino.IAction>(actionAttributes);

        let pecorinoEndpoint: string;

        // Pecorinoオーソリ取得
        type IPecorinoTransaction = pecorinoapi.factory.transaction.pay.ITransaction |
            pecorinoapi.factory.transaction.transfer.ITransaction;
        let pecorinoTransaction: IPecorinoTransaction;

        try {
            if (repos.payTransactionService !== undefined) {
                pecorinoEndpoint = repos.payTransactionService.options.endpoint;

                debug('starting pecorino pay transaction...', params.price);
                pecorinoTransaction = await repos.payTransactionService.start({
                    // 最大1ヵ月のオーソリ
                    expires: moment().add(1, 'month').toDate(),
                    agent: {
                        name: `kwskfs-transaction-${transaction.id}`
                    },
                    recipient: {
                        typeOf: 'Person',
                        id: transaction.seller.id,
                        name: transaction.seller.name,
                        url: transaction.seller.url
                    },
                    amount: params.price,
                    notes: (params.notes !== undefined) ? params.notes : '川崎屋台村 支払取引',
                    fromAccountNumber: params.fromAccountNumber
                });
                debug('pecorinoTransaction started.', pecorinoTransaction.id);
            } else if (repos.transferTransactionService !== undefined) {
                pecorinoEndpoint = repos.transferTransactionService.options.endpoint;

                // 組織から転送先口座IDを取得する
                const seller = await repos.organization.findById(transaction.seller.id);
                const pecorinoPaymentAccepted = <factory.organization.IPaymentAccepted<factory.paymentMethodType.Pecorino>>
                    seller.paymentAccepted.find(
                        (a) => a.paymentMethodType === factory.paymentMethodType.Pecorino
                    );
                if (pecorinoPaymentAccepted === undefined) {
                    throw new factory.errors.Argument('repos', 'Pecorino transfer payment not accepted.');
                }

                debug('starting pecorino pay transaction...', params.price);
                pecorinoTransaction = await repos.transferTransactionService.start({
                    // 最大1ヵ月のオーソリ
                    expires: moment().add(1, 'month').toDate(),
                    agent: {
                        name: `kwskfs-transaction-${transaction.id}`
                    },
                    recipient: {
                        typeOf: 'Person',
                        id: transaction.seller.id,
                        name: transaction.seller.name,
                        url: transaction.seller.url
                    },
                    amount: params.price,
                    notes: (params.notes !== undefined) ? params.notes : '川崎屋台村 支払取引',
                    fromAccountNumber: params.fromAccountNumber,
                    toAccountNumber: pecorinoPaymentAccepted.accountId
                });
                debug('pecorinoTransaction started.', pecorinoTransaction.id);
            } else {
                throw new factory.errors.Argument('resos', 'payTransactionService or transferTransactionService required.');
            }
        } catch (error) {
            // actionにエラー結果を追加
            try {
                // tslint:disable-next-line:max-line-length no-single-line-block-comment
                const actionError = (error instanceof Error) ? { ...error, ...{ name: error.name, message: error.message } } : /* istanbul ignore next */error;
                await repos.action.giveUp(action.typeOf, action.id, actionError);
            } catch (__) {
                // 失敗したら仕方ない
            }

            // PecorinoAPIのレスポンスステータスコードが4xxであればクライアントエラー
            if (error.name === 'PecorinoRequestError') {
                // Pecorino APIのステータスコード4xxをハンドリング
                const message = `${error.name}:${error.message}`;
                switch (error.code) {
                    case BAD_REQUEST: // 400
                        throw new factory.errors.Argument('fromAccountNumber', message);
                    case UNAUTHORIZED: // 401
                        throw new factory.errors.Unauthorized(message);
                    case FORBIDDEN: // 403
                        throw new factory.errors.Forbidden(message);
                    case NOT_FOUND: // 404
                        throw new factory.errors.NotFound(message);
                    case TOO_MANY_REQUESTS: // 429
                        throw new factory.errors.RateLimitExceeded(message);
                    default:
                        throw new factory.errors.ServiceUnavailable(message);
                }
            }

            throw new Error(error);
        }

        // アクションを完了
        debug('ending authorize action...');

        const actionResult: factory.action.authorize.pecorino.IResult = {
            price: params.price,
            pecorinoTransaction: pecorinoTransaction,
            pecorinoEndpoint: pecorinoEndpoint
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
