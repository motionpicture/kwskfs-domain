/**
 * 決済サービス
 */
import * as GMO from '@motionpicture/gmo-service';
import * as factory from '@motionpicture/kwskfs-factory';
import * as pecorinoapi from '@motionpicture/pecorino-api-nodejs-client';
import * as AWS from 'aws-sdk';
import * as createDebug from 'debug';
import { OK } from 'http-status';
import * as moment from 'moment';

import { BluelabService, IProcessPaymentParams, IProcessPaymentResult } from './payment/bluelab';

import { MongoRepository as ActionRepo } from '../repo/action';
import { MongoRepository as OrganizationRepo } from '../repo/organization';
import { MongoRepository as TaskRepo } from '../repo/task';
import { MongoRepository as TransactionRepo } from '../repo/transaction';

const debug = createDebug('kwskfs-domain:service:payment');

const BLUELAB_ATTRIBUTE_NAME = 'bluelabAccountNumber';

export type IBluelabPaymentMethod = factory.organization.IPaymentAccepted<factory.paymentMethodType.Bluelab>;

/**
 * Pecorino支払実行
 * @param transactionId 取引ID
 */
export function payPecorino(transactionId: string) {
    // tslint:disable-next-line:max-func-body-length
    return async (repos: {
        action: ActionRepo;
        organization: OrganizationRepo;
        transaction: TransactionRepo;
        pecorinoAuthClient: pecorinoapi.auth.ClientCredentials;
    }) => {
        const transaction = await repos.transaction.findById(factory.transactionType.PlaceOrder, transactionId);
        const transactionResult = transaction.result;
        if (transactionResult === undefined) {
            throw new factory.errors.NotFound('transaction.result');
        }
        const potentialActions = transaction.potentialActions;
        if (potentialActions === undefined) {
            throw new factory.errors.NotFound('transaction.potentialActions');
        }
        const orderPotentialActions = potentialActions.order.potentialActions;
        if (orderPotentialActions === undefined) {
            throw new factory.errors.NotFound('order.potentialActions');
        }

        const payActionAttributes = orderPotentialActions.payPecorino;
        if (payActionAttributes !== undefined) {
            // Pecorino承認アクションがあるはず
            const authorizeAction = <factory.action.authorize.pecorino.IAction>transaction.object.authorizeActions
                .filter((a) => a.actionStatus === factory.actionStatusType.CompletedActionStatus)
                .find((a) => a.object.typeOf === factory.action.authorize.pecorino.ObjectType.Pecorino);

            // アクション開始
            const action = await repos.action.start<factory.action.trade.pay.IAction>(payActionAttributes);
            // let bluelabProcessPaymentParams: IProcessPaymentParams | null = null;
            // let bluelabProcessPaymentResult: IProcessPaymentResult | null = null;

            try {
                // 承認アクション結果は基本的に必ずあるはず
                if (authorizeAction.result === undefined) {
                    throw new factory.errors.NotFound('authorizeAction.result');
                }

                const pecorinoTransaction = authorizeAction.result.pecorinoTransaction;
                switch (pecorinoTransaction.typeOf) {
                    case pecorinoapi.factory.transactionType.Pay:

                        // 支払取引の場合、確定
                        const payTransactionService = new pecorinoapi.service.transaction.Pay({
                            endpoint: authorizeAction.result.pecorinoEndpoint,
                            auth: repos.pecorinoAuthClient
                        });
                        await payTransactionService.confirm({
                            transactionId: pecorinoTransaction.id
                        });
                        break;

                    case pecorinoapi.factory.transactionType.Transfer:
                        // 転送取引の場合確定
                        const transferTransactionService = new pecorinoapi.service.transaction.Transfer({
                            endpoint: authorizeAction.result.pecorinoEndpoint,
                            auth: repos.pecorinoAuthClient
                        });
                        await transferTransactionService.confirm({
                            transactionId: pecorinoTransaction.id
                        });

                        if (transaction.object.clientUser.username !== undefined) {
                            // const username = transaction.object.clientUser.username;
                            // const seller = await repos.organization.findById(transaction.seller.id);
                            // const bluelabPaymentMethod = <IBluelabPaymentMethod>seller.paymentAccepted.find(
                            //     (p) => p.paymentMethodType === factory.paymentMethodType.Bluelab
                            // );

                            // // bluelab決済方法が組織に登録されていればそのbluelab連携
                            // if (bluelabPaymentMethod !== undefined) {
                            //     const bluelab = new BluelabService({
                            //         endpoint: <string>process.env.BLUELAB_API_ENDPOINT,
                            //         apiKey: <string>process.env.BLUELAB_API_KEY
                            //     });

                            //     // bluelab口座番号を取得
                            //     let accountNumber = await getBluelabAccountNumber(
                            //         <string>process.env.AWS_ACCESS_KEY_ID,
                            //         <string>process.env.AWS_SECRET_ACCESS_KEY,
                            //         <string>process.env.COGNITO_USER_POOL_ID,
                            //         username
                            //     );

                            //     // 口座未開設であれば開設する
                            //     if (accountNumber === undefined) {
                            //         const openAccountResult = await bluelab.openAccount({ accessToken: username });
                            //         if (openAccountResult.statusCode === OK) {
                            //             accountNumber = openAccountResult.body.registInfo.paymentMethodId;

                            //             // Cognitoに登録
                            //             await registerBluelabAccountNumber(
                            //                 <string>process.env.AWS_ACCESS_KEY_ID,
                            //                 <string>process.env.AWS_SECRET_ACCESS_KEY,
                            //                 <string>process.env.COGNITO_USER_POOL_ID,
                            //                 username,
                            //                 accountNumber
                            //             );
                            //         }
                            //     }

                            //     if (accountNumber !== undefined) {
                            //         bluelabProcessPaymentParams = {
                            //             accessToken: username,
                            //             paymentAmount: transactionResult.order.price,
                            //             paymentMethodID: accountNumber,
                            //             beneficiaryAccountInformation: bluelabPaymentMethod,
                            //             paymentDetailsList: transactionResult.order
                            //         };
                            //         bluelabProcessPaymentResult = await bluelab.processPayment(bluelabProcessPaymentParams);
                            //     }
                            // }
                        }
                        break;

                    default:
                        throw new factory.errors.NotImplemented(
                            `transaction type '${(<any>pecorinoTransaction).typeOf}' not implemented.`
                        );
                }

                // Pecorino決済の場合キャッシュバック
                // const CACHBACK = 100;
                // const customerContact = <factory.person.IContact>transaction.object.customerContact;
                // const depositTransactionService = new pecorinoapi.service.transaction.Deposit({
                //     endpoint: authorizeAction.result.pecorinoEndpoint,
                //     auth: repos.pecorinoAuthClient
                // });
                // const depositTransaction = await depositTransactionService.start({
                //     toAccountId: authorizeAction.result.pecorinoTransaction.object.fromAccountId,
                //     expires: moment().add(1, 'minutes').toDate(),
                //     agent: transaction.seller,
                //     recipient: {
                //         typeOf: transaction.agent.typeOf,
                //         id: transaction.agent.id,
                //         name: `${customerContact.givenName} ${customerContact.familyName}`,
                //         url: transaction.agent.url
                //     },
                //     price: CACHBACK,
                //     notes: 'kwskfs incentive'
                // });
                // await depositTransactionService.confirm({ transactionId: depositTransaction.id });
            } catch (error) {
                // actionにエラー結果を追加
                try {
                    // tslint:disable-next-line:no-single-line-block-comment
                    const actionError = (error instanceof Error) ? { ...error, message: error.message } : /* istanbul ignore next */ error;
                    await repos.action.giveUp(payActionAttributes.typeOf, action.id, actionError);
                } catch (__) {
                    // 失敗したら仕方ない
                }

                throw new Error(error);
            }

            // アクション完了
            debug('ending action...');
            const actionResult: factory.action.trade.pay.IResult = <any>{
                // bluelabProcessPaymentParams: bluelabProcessPaymentParams,
                // bluelabProcessPaymentResult: bluelabProcessPaymentResult
            };
            await repos.action.complete(payActionAttributes.typeOf, action.id, actionResult);
        }
    };
}

/**
 * Pecorinoオーソリ取消
 * @param transactionId 取引ID
 */
// tslint:disable-next-line:max-func-body-length
export function cancelPecorinoAuth(transactionId: string) {
    return async (repos: {
        action: ActionRepo;
        pecorinoAuthClient: pecorinoapi.auth.ClientCredentials;
    }) => {
        // Pecorino承認アクションを取得
        const authorizeActions: factory.action.authorize.pecorino.IAction[] =
            await repos.action.findAuthorizeByTransactionId(transactionId)
                .then((actions) => actions
                    .filter((a) => a.object.typeOf === factory.action.authorize.pecorino.ObjectType.Pecorino)
                    .filter((a) => a.actionStatus === factory.actionStatusType.CompletedActionStatus)
                );

        await Promise.all(authorizeActions.map(async (action) => {
            // 承認アクション結果は基本的に必ずあるはず
            if (action.result === undefined) {
                throw new factory.errors.NotFound('action.result');
            }

            switch (action.result.pecorinoTransaction.typeOf) {
                case pecorinoapi.factory.transactionType.Pay:
                    // 支払取引の場合、中止
                    const payTransactionService = new pecorinoapi.service.transaction.Pay({
                        endpoint: action.result.pecorinoEndpoint,
                        auth: repos.pecorinoAuthClient
                    });
                    await payTransactionService.cancel({
                        transactionId: action.result.pecorinoTransaction.id
                    });
                    break;

                case pecorinoapi.factory.transactionType.Transfer:
                    // 転送取引の場合、中止
                    const transferTransactionService = new pecorinoapi.service.transaction.Transfer({
                        endpoint: action.result.pecorinoEndpoint,
                        auth: repos.pecorinoAuthClient
                    });
                    await transferTransactionService.cancel({
                        transactionId: action.result.pecorinoTransaction.id
                    });
                    break;

                default:
                    throw new factory.errors.NotImplemented(
                        `transaction type '${(<any>action.result.pecorinoTransaction).typeOf}' not implemented.`
                    );
            }
        }));
    };
}

/**
 * Bluelab決済実行
 * @param transactionId 取引ID
 */
export function payBluelab(transactionId: string) {
    // tslint:disable-next-line:max-func-body-length
    return async (repos: {
        action: ActionRepo;
        organization: OrganizationRepo;
        transaction: TransactionRepo;
    }) => {
        const transaction = await repos.transaction.findById(factory.transactionType.PlaceOrder, transactionId);
        const transactionResult = transaction.result;
        if (transactionResult === undefined) {
            throw new factory.errors.NotFound('transaction.result');
        }
        const potentialActions = transaction.potentialActions;
        if (potentialActions === undefined) {
            throw new factory.errors.NotFound('transaction.potentialActions');
        }
        const orderPotentialActions = potentialActions.order.potentialActions;
        if (orderPotentialActions === undefined) {
            throw new factory.errors.NotFound('order.potentialActions');
        }

        const payActionAttributes = orderPotentialActions.payBluelab;
        if (payActionAttributes !== undefined) {
            // アクション開始
            const action = await repos.action.start<factory.action.trade.pay.IAction>(payActionAttributes);
            let bluelabProcessPaymentParams: IProcessPaymentParams | null = null;
            let bluelabProcessPaymentResult: IProcessPaymentResult | null = null;

            try {
                if (transaction.object.clientUser.username !== undefined) {
                    const username = transaction.object.clientUser.username;
                    const seller = await repos.organization.findById(transaction.seller.id);
                    const bluelabPaymentMethod = <IBluelabPaymentMethod>seller.paymentAccepted.find(
                        (p) => p.paymentMethodType === factory.paymentMethodType.Bluelab
                    );

                    // bluelab決済方法が組織に登録されていればそのbluelab連携
                    if (bluelabPaymentMethod !== undefined) {
                        const bluelab = new BluelabService({
                            endpoint: <string>process.env.BLUELAB_API_ENDPOINT,
                            apiKey: <string>process.env.BLUELAB_API_KEY
                        });

                        // bluelab口座番号を取得
                        let accountNumber = await getBluelabAccountNumber(
                            <string>process.env.AWS_ACCESS_KEY_ID,
                            <string>process.env.AWS_SECRET_ACCESS_KEY,
                            <string>process.env.COGNITO_USER_POOL_ID,
                            username
                        );

                        // 口座未開設であれば開設する
                        if (accountNumber === undefined) {
                            const openAccountResult = await bluelab.openAccount({ accessToken: username });
                            if (openAccountResult.statusCode === OK) {
                                accountNumber = openAccountResult.body.registInfo.paymentMethodId;

                                // Cognitoに登録
                                await registerBluelabAccountNumber(
                                    <string>process.env.AWS_ACCESS_KEY_ID,
                                    <string>process.env.AWS_SECRET_ACCESS_KEY,
                                    <string>process.env.COGNITO_USER_POOL_ID,
                                    username,
                                    accountNumber
                                );
                            }
                        }

                        if (accountNumber !== undefined) {
                            bluelabProcessPaymentParams = {
                                accessToken: username,
                                paymentAmount: transactionResult.order.price,
                                paymentMethodID: accountNumber,
                                beneficiaryAccountInformation: bluelabPaymentMethod,
                                paymentDetailsList: transactionResult.order
                            };
                            bluelabProcessPaymentResult = await bluelab.processPayment(bluelabProcessPaymentParams);
                            // 結果が期待通りでなければそのまま例外とする
                            if (bluelabProcessPaymentResult.body === undefined ||
                                bluelabProcessPaymentResult.body.resultsList === undefined) {
                                throw bluelabProcessPaymentResult;
                            }
                        }
                    }
                }
            } catch (error) {
                // actionにエラー結果を追加
                try {
                    const actionError = {
                        ...error,
                        name: error.name,
                        message: error.message,
                        bluelabProcessPaymentParams: bluelabProcessPaymentParams,
                        bluelabProcessPaymentResult: bluelabProcessPaymentResult
                    };
                    await repos.action.giveUp(payActionAttributes.typeOf, action.id, actionError);
                } catch (__) {
                    // 失敗したら仕方ない
                }

                throw new Error(error);
            }

            // アクション完了
            debug('ending action...');
            const actionResult: factory.action.trade.pay.IResult = {
                bluelabProcessPaymentParams: bluelabProcessPaymentParams,
                bluelabProcessPaymentResult: bluelabProcessPaymentResult
            };
            await repos.action.complete(payActionAttributes.typeOf, action.id, actionResult);
        }
    };
}

export async function getBluelabAccountNumber(
    accessKeyId: string,
    secretAccessKey: string,
    userPoolId: string,
    username: string
) {
    return new Promise<string | undefined>((resolve, reject) => {
        const cognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider({
            apiVersion: 'latest',
            region: 'ap-northeast-1',
            accessKeyId: accessKeyId,
            secretAccessKey: secretAccessKey
        });

        cognitoIdentityServiceProvider.adminGetUser(
            {
                Username: username,
                UserPoolId: userPoolId
            },
            (err, data) => {
                if (err instanceof Error) {
                    reject(err);
                } else {
                    if (data.UserAttributes === undefined) {
                        reject(new Error('adminGetUser data.UserAttributes undefined'));
                    } else {
                        const attribute = data.UserAttributes.find((a) => a.Name === `custom:${BLUELAB_ATTRIBUTE_NAME}`);
                        resolve((attribute !== undefined) ? attribute.Value : undefined);
                    }
                }
            });
    });
}

/**
 * bluelab口座番号をCognitoに登録する
 */
export async function registerBluelabAccountNumber(
    accessKeyId: string,
    secretAccessKey: string,
    userPoolId: string,
    username: string,
    accountNumber: string
) {
    return new Promise<void>((resolve, reject) => {
        const cognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider({
            apiVersion: 'latest',
            region: 'ap-northeast-1',
            accessKeyId: accessKeyId,
            secretAccessKey: secretAccessKey
        });

        cognitoIdentityServiceProvider.adminUpdateUserAttributes(
            {
                Username: username,
                UserPoolId: userPoolId,
                UserAttributes: [
                    {
                        Name: `custom:${BLUELAB_ATTRIBUTE_NAME}`,
                        Value: accountNumber
                    }
                ]
            },
            (err) => {
                if (err instanceof Error) {
                    reject(err);
                } else {
                    resolve();
                }
            });
    });
}

/**
 * クレジットカードオーソリ取消
 * @param transactionId 取引ID
 */
export function cancelCreditCardAuth(transactionId: string) {
    return async (repos: { action: ActionRepo }) => {
        // クレジットカード仮売上アクションを取得
        const authorizeActions: factory.action.authorize.creditCard.IAction[] =
            await repos.action.findAuthorizeByTransactionId(transactionId)
                .then((actions) => actions
                    .filter((a) => a.object.typeOf === factory.action.authorize.creditCard.ObjectType.CreditCard)
                    .filter((a) => a.actionStatus === factory.actionStatusType.CompletedActionStatus)
                );

        await Promise.all(authorizeActions.map(async (action) => {
            const entryTranArgs = (<factory.action.authorize.creditCard.IResult>action.result).entryTranArgs;
            const execTranArgs = (<factory.action.authorize.creditCard.IResult>action.result).execTranArgs;

            debug('calling alterTran...');
            await GMO.services.credit.alterTran({
                shopId: entryTranArgs.shopId,
                shopPass: entryTranArgs.shopPass,
                accessId: execTranArgs.accessId,
                accessPass: execTranArgs.accessPass,
                jobCd: GMO.utils.util.JobCd.Void,
                amount: entryTranArgs.amount
            });
        }));

        // 失敗したら取引状態確認してどうこう、という処理も考えうるが、
        // GMOはapiのコール制限が厳しく、下手にコールするとすぐにクライアントサイドにも影響をあたえてしまう
        // リトライはタスクの仕組みに含まれているので失敗してもここでは何もしない
    };
}

/**
 * クレジットカード売上確定
 * @export
 * @param transactionId 取引ID
 */
export function payCreditCard(transactionId: string) {
    return async (repos: {
        action: ActionRepo;
        transaction: TransactionRepo;
    }) => {
        const transaction = await repos.transaction.findById(factory.transactionType.PlaceOrder, transactionId);
        const transactionResult = transaction.result;
        if (transactionResult === undefined) {
            throw new factory.errors.NotFound('transaction.result');
        }
        const potentialActions = transaction.potentialActions;
        if (potentialActions === undefined) {
            throw new factory.errors.NotFound('transaction.potentialActions');
        }
        const orderPotentialActions = potentialActions.order.potentialActions;
        if (orderPotentialActions === undefined) {
            throw new factory.errors.NotFound('order.potentialActions');
        }

        const payActionAttributes = orderPotentialActions.payCreditCard;
        if (payActionAttributes !== undefined) {
            // クレジットカード承認アクションがあるはず
            const authorizeAction = <factory.action.authorize.creditCard.IAction>transaction.object.authorizeActions
                .filter((a) => a.actionStatus === factory.actionStatusType.CompletedActionStatus)
                .find((a) => a.object.typeOf === factory.action.authorize.creditCard.ObjectType.CreditCard);

            // アクション開始
            const action = await repos.action.start<factory.action.trade.pay.IAction>(payActionAttributes);

            let alterTranResult: GMO.services.credit.IAlterTranResult;
            try {
                const entryTranArgs = (<factory.action.authorize.creditCard.IResult>authorizeAction.result).entryTranArgs;
                const execTranArgs = (<factory.action.authorize.creditCard.IResult>authorizeAction.result).execTranArgs;

                // 取引状態参照
                const searchTradeResult = await GMO.services.credit.searchTrade({
                    shopId: entryTranArgs.shopId,
                    shopPass: entryTranArgs.shopPass,
                    orderId: entryTranArgs.orderId
                });

                if (searchTradeResult.jobCd === GMO.utils.util.JobCd.Sales) {
                    debug('already in SALES');
                    // すでに実売上済み
                    alterTranResult = {
                        accessId: searchTradeResult.accessId,
                        accessPass: searchTradeResult.accessPass,
                        forward: searchTradeResult.forward,
                        approve: searchTradeResult.approve,
                        tranId: searchTradeResult.tranId,
                        tranDate: ''
                    };
                } else {
                    debug('calling alterTran...');
                    alterTranResult = await GMO.services.credit.alterTran({
                        shopId: entryTranArgs.shopId,
                        shopPass: entryTranArgs.shopPass,
                        accessId: execTranArgs.accessId,
                        accessPass: execTranArgs.accessPass,
                        jobCd: GMO.utils.util.JobCd.Sales,
                        amount: entryTranArgs.amount
                    });

                    // 失敗したら取引状態確認してどうこう、という処理も考えうるが、
                    // GMOはapiのコール制限が厳しく、下手にコールするとすぐにクライアントサイドにも影響をあたえてしまう
                    // リトライはタスクの仕組みに含まれているので失敗してもここでは何もしない
                }
            } catch (error) {
                // actionにエラー結果を追加
                try {
                    // tslint:disable-next-line:max-line-length no-single-line-block-comment
                    const actionError = (error instanceof Error) ? { ...error, ...{ message: error.message } } : /* istanbul ignore next */ error;
                    await repos.action.giveUp(payActionAttributes.typeOf, action.id, actionError);
                } catch (__) {
                    // 失敗したら仕方ない
                }

                throw new Error(error);
            }

            // アクション完了
            debug('ending action...');
            const actionResult: factory.action.trade.pay.IResult = { creditCardSales: alterTranResult };
            await repos.action.complete(payActionAttributes.typeOf, action.id, actionResult);
        }
    };
}

/**
 * 注文返品取引からクレジットカード返金処理を実行する
 * @param transactionId 注文返品取引ID
 */
export function refundCreditCard(transactionId: string) {
    return async (repos: {
        action: ActionRepo;
        transaction: TransactionRepo;
        task: TaskRepo;
    }) => {
        const transaction = await repos.transaction.findById(factory.transactionType.ReturnOrder, transactionId);
        const potentialActions = transaction.potentialActions;
        const placeOrderTransaction = transaction.object.transaction;
        const placeOrderTransactionResult = placeOrderTransaction.result;
        const authorizeActions = placeOrderTransaction.object.authorizeActions
            .filter((action) => action.actionStatus === factory.actionStatusType.CompletedActionStatus)
            .filter((action) => action.object.typeOf === factory.action.authorize.creditCard.ObjectType.CreditCard);

        if (potentialActions === undefined) {
            throw new factory.errors.NotFound('transaction.potentialActions');
        }

        if (placeOrderTransactionResult === undefined) {
            throw new factory.errors.NotFound('placeOrderTransaction.result');
        }
        const returnOrderPotentialActions = potentialActions.returnOrder.potentialActions;
        if (returnOrderPotentialActions === undefined) {
            throw new factory.errors.NotFound('returnOrder.potentialActions');
        }

        await Promise.all(authorizeActions.map(async (authorizeAction) => {
            // アクション開始
            const refundActionAttributes = <factory.action.trade.refund.IAttributes>returnOrderPotentialActions.refund.find(
                (a) => a.object.object.paymentMethod.paymentMethod === factory.paymentMethodType.CreditCard
            );
            const action = await repos.action.start<factory.action.trade.refund.IAction>(refundActionAttributes);

            let alterTranResult: GMO.services.credit.IAlterTranResult;
            try {
                // 取引状態参照
                const gmoTrade = await GMO.services.credit.searchTrade({
                    shopId: authorizeAction.result.entryTranArgs.shopId,
                    shopPass: authorizeAction.result.entryTranArgs.shopPass,
                    orderId: authorizeAction.result.entryTranArgs.orderId
                });
                debug('gmoTrade is', gmoTrade);

                // 実売上状態であれば取消
                // 手数料がかかるのであれば、ChangeTran、かからないのであれば、AlterTran
                if (gmoTrade.status === GMO.utils.util.Status.Sales) {
                    debug('canceling credit card sales...', authorizeAction);
                    alterTranResult = await GMO.services.credit.alterTran({
                        shopId: authorizeAction.result.entryTranArgs.shopId,
                        shopPass: authorizeAction.result.entryTranArgs.shopPass,
                        accessId: gmoTrade.accessId,
                        accessPass: gmoTrade.accessPass,
                        jobCd: GMO.utils.util.JobCd.Void
                    });
                    debug('GMO alterTranResult is', alterTranResult);
                } else {
                    alterTranResult = {
                        accessId: gmoTrade.accessId,
                        accessPass: gmoTrade.accessPass,
                        forward: gmoTrade.forward,
                        approve: gmoTrade.approve,
                        tranId: gmoTrade.tranId,
                        tranDate: ''
                    };
                }
            } catch (error) {
                // actionにエラー結果を追加
                try {
                    // tslint:disable-next-line:max-line-length no-single-line-block-comment
                    const actionError = (error instanceof Error) ? { ...error, ...{ message: error.message } } : /* istanbul ignore next */ error;
                    await repos.action.giveUp(refundActionAttributes.typeOf, action.id, actionError);
                } catch (__) {
                    // 失敗したら仕方ない
                }

                throw new Error(error);
            }

            // アクション完了
            debug('ending action...');
            await repos.action.complete(refundActionAttributes.typeOf, action.id, { alterTranResult });

            // 潜在アクション
            await onRefund(refundActionAttributes)({ task: repos.task });
        }));
    };
}

/**
 * 注文返品取引からPecorino返金処理を実行する
 * @param transactionId 注文返品取引ID
 */
export function refundPecorino(transactionId: string) {
    return async (repos: {
        action: ActionRepo;
        transaction: TransactionRepo;
        task: TaskRepo;
        pecorinoAuthClient: pecorinoapi.auth.ClientCredentials;
    }) => {
        const transaction = await repos.transaction.findById(factory.transactionType.ReturnOrder, transactionId);
        const potentialActions = transaction.potentialActions;
        const placeOrderTransaction = transaction.object.transaction;
        const placeOrderTransactionResult = placeOrderTransaction.result;
        // 注文取引上のPecorino承認アクションを取り出す
        const authorizeActions = <factory.action.authorize.pecorino.IAction[]>placeOrderTransaction.object.authorizeActions
            .filter((action) => action.actionStatus === factory.actionStatusType.CompletedActionStatus)
            .filter((action) => action.object.typeOf === factory.action.authorize.pecorino.ObjectType.Pecorino);

        if (potentialActions === undefined) {
            throw new factory.errors.NotFound('transaction.potentialActions');
        }

        if (placeOrderTransactionResult === undefined) {
            throw new factory.errors.NotFound('placeOrderTransaction.result');
        }
        const returnOrderPotentialActions = potentialActions.returnOrder.potentialActions;
        if (returnOrderPotentialActions === undefined) {
            throw new factory.errors.NotFound('returnOrder.potentialActions');
        }

        await Promise.all(authorizeActions.map(async (authorizeAction) => {
            // アクション開始
            const refundActionAttributes = <factory.action.trade.refund.IAttributes>returnOrderPotentialActions.refund.find(
                (a) => a.object.object.paymentMethod.paymentMethod === factory.paymentMethodType.Pecorino
            );
            const action = await repos.action.start<factory.action.trade.refund.IAction>(refundActionAttributes);

            try {
                const authorizeActionResult = (<factory.action.authorize.pecorino.IResult>authorizeAction.result);
                const pecorinoTransaction = authorizeActionResult.pecorinoTransaction;

                // Pecorino入金取引で返金実行
                const depositService = new pecorinoapi.service.transaction.Deposit({
                    endpoint: authorizeActionResult.pecorinoEndpoint,
                    auth: repos.pecorinoAuthClient
                });
                const depositTransaction = await depositService.start({
                    toAccountId: pecorinoTransaction.object.fromAccountId,
                    // tslint:disable-next-line:no-magic-numbers
                    expires: moment().add(5, 'minutes').toDate(),
                    agent: pecorinoTransaction.recipient,
                    recipient: pecorinoTransaction.agent,
                    price: pecorinoTransaction.object.price,
                    notes: '川崎屋台村 返金'
                });
                await depositService.confirm({ transactionId: depositTransaction.id });
            } catch (error) {
                // actionにエラー結果を追加
                try {
                    // tslint:disable-next-line:max-line-length no-single-line-block-comment
                    const actionError = (error instanceof Error) ? { ...error, ...{ message: error.message } } : /* istanbul ignore next */ error;
                    await repos.action.giveUp(refundActionAttributes.typeOf, action.id, actionError);
                } catch (__) {
                    // 失敗したら仕方ない
                }

                throw new Error(error);
            }

            // アクション完了
            debug('ending action...');
            await repos.action.complete(refundActionAttributes.typeOf, action.id, {});

            // 潜在アクション
            await onRefund(refundActionAttributes)({ task: repos.task });
        }));
    };
}

/**
 * 返金後のアクション
 * @param refundActionAttributes 返金アクション属性
 */
function onRefund(refundActionAttributes: factory.action.trade.refund.IAttributes) {
    return async (repos: { task: TaskRepo }) => {
        const potentialActions = refundActionAttributes.potentialActions;
        const now = new Date();
        const taskAttributes: factory.task.IAttributes[] = [];
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (potentialActions !== undefined) {
            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore else */
            if (potentialActions.sendEmailMessage !== undefined) {
                taskAttributes.push(factory.task.sendEmailMessage.createAttributes({
                    status: factory.taskStatus.Ready,
                    runsAt: now, // なるはやで実行
                    remainingNumberOfTries: 3,
                    lastTriedAt: null,
                    numberOfTried: 0,
                    executionResults: [],
                    data: {
                        actionAttributes: potentialActions.sendEmailMessage
                    }
                }));
            }
        }

        // タスク保管
        await Promise.all(taskAttributes.map(async (taskAttribute) => {
            return repos.task.save(taskAttribute);
        }));
    };
}
