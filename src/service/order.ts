/**
 * 注文サービス
 */

import * as factory from '@motionpicture/kwskfs-factory';
import * as createDebug from 'debug';

import { MongoRepository as ActionRepo } from '../repo/action';
import { MongoRepository as OrderRepo } from '../repo/order';
import { MongoRepository as OwnershipInfoRepo } from '../repo/ownershipInfo';
import { MongoRepository as TaskRepo } from '../repo/task';
import { MongoRepository as TransactionRepo } from '../repo/transaction';

const debug = createDebug('kwskfs-domain:service:order');

export type IPlaceOrderTransaction = factory.transaction.placeOrder.ITransaction;

/**
 * 注文取引結果から注文を作成する
 * @param transactionId 注文取引ID
 */
export function createFromTransaction(transactionId: string) {
    return async (repos: {
        action: ActionRepo;
        order: OrderRepo;
        transaction: TransactionRepo;
        task: TaskRepo;
    }) => {
        const transaction = await repos.transaction.findPlaceOrderById(transactionId);
        const transactionResult = transaction.result;
        if (transactionResult === undefined) {
            throw new factory.errors.NotFound('transaction.result');
        }
        const potentialActions = transaction.potentialActions;
        if (potentialActions === undefined) {
            throw new factory.errors.NotFound('transaction.potentialActions');
        }

        // アクション開始
        const orderActionAttributes = potentialActions.order;
        const action = await repos.action.start<factory.action.trade.order.IAction>(orderActionAttributes);

        try {
            // 注文保管
            await repos.order.createIfNotExist(transactionResult.order);
        } catch (error) {
            // actionにエラー結果を追加
            try {
                // tslint:disable-next-line:max-line-length no-single-line-block-comment
                const actionError = (error instanceof Error) ? { ...error, ...{ message: error.message } } : /* istanbul ignore next */ error;
                await repos.action.giveUp(orderActionAttributes.typeOf, action.id, actionError);
            } catch (__) {
                // 失敗したら仕方ない
            }

            throw new Error(error);
        }

        // アクション完了
        debug('ending action...');
        await repos.action.complete(orderActionAttributes.typeOf, action.id, {});

        // 潜在アクション
        await onCreate(transactionId, orderActionAttributes)({ task: repos.task });
    };
}

/**
 * 注文作成後のアクション
 * @param transactionId 注文取引ID
 * @param orderActionAttributes 注文アクション属性
 */
function onCreate(transactionId: string, orderActionAttributes: factory.action.trade.order.IAttributes) {
    return async (repos: { task: TaskRepo }) => {
        // potentialActionsのためのタスクを生成
        const orderPotentialActions = orderActionAttributes.potentialActions;
        const now = new Date();
        const taskAttributes: factory.task.IAttributes[] = [];

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (orderPotentialActions !== undefined) {
            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore else */
            if (orderPotentialActions.sendOrder !== undefined) {
                taskAttributes.push(factory.task.sendOrder.createAttributes({
                    status: factory.taskStatus.Ready,
                    runsAt: now, // なるはやで実行
                    remainingNumberOfTries: 10,
                    lastTriedAt: null,
                    numberOfTried: 0,
                    executionResults: [],
                    data: {
                        transactionId: transactionId
                    }
                }));
            }

            // クレジットカード決済
            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore else */
            if (orderPotentialActions.payCreditCard !== undefined) {
                taskAttributes.push(factory.task.payCreditCard.createAttributes({
                    status: factory.taskStatus.Ready,
                    runsAt: now, // なるはやで実行
                    remainingNumberOfTries: 10,
                    lastTriedAt: null,
                    numberOfTried: 0,
                    executionResults: [],
                    data: {
                        transactionId: transactionId
                    }
                }));
            }

            // Pecorino決済
            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore else */
            if (orderPotentialActions.payPecorino !== undefined) {
                taskAttributes.push(factory.task.payPecorino.createAttributes({
                    status: factory.taskStatus.Ready,
                    runsAt: now, // なるはやで実行
                    remainingNumberOfTries: 10,
                    lastTriedAt: null,
                    numberOfTried: 0,
                    executionResults: [],
                    data: {
                        transactionId: transactionId
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

/**
 * 注文返品アクション
 * @param returnOrderTransactionId 注文返品取引ID
 */
export function cancelReservations(returnOrderTransactionId: string) {
    return async (
        actionRepo: ActionRepo,
        orderRepo: OrderRepo,
        ownershipInfoRepo: OwnershipInfoRepo,
        transactionRepo: TransactionRepo,
        taskRepo: TaskRepo
    ) => {
        const transaction = await transactionRepo.findReturnOrderById(returnOrderTransactionId);
        const potentialActions = transaction.potentialActions;
        const placeOrderTransaction = transaction.object.transaction;
        const placeOrderTransactionResult = placeOrderTransaction.result;

        if (potentialActions === undefined) {
            throw new factory.errors.NotFound('transaction.potentialActions');
        }
        if (placeOrderTransactionResult === undefined) {
            throw new factory.errors.NotFound('placeOrderTransaction.result');
        }

        // アクション開始
        const returnOrderActionAttributes = potentialActions.returnOrder;
        const action = await actionRepo.start<factory.action.transfer.returnAction.order.IAction>(returnOrderActionAttributes);

        try {
            const order = placeOrderTransactionResult.order;

            // 所有権の予約ステータスを変更
            const ownershipInfos = placeOrderTransactionResult.ownershipInfos;
            debug('invalidating ownershipInfos...', ownershipInfos);
            await Promise.all(ownershipInfos.map(async (ownershipInfo) => {
                await ownershipInfoRepo.ownershipInfoModel.findOneAndUpdate(
                    { identifier: ownershipInfo.identifier },
                    { 'typeOfGood.reservationStatus': factory.reservationStatusType.ReservationCancelled }
                ).exec();
            }));

            // 注文ステータス変更
            debug('changing orderStatus...');
            await orderRepo.changeStatus(order.orderNumber, factory.orderStatus.OrderReturned);
        } catch (error) {
            // actionにエラー結果を追加
            try {
                // tslint:disable-next-line:max-line-length no-single-line-block-comment
                const actionError = (error instanceof Error) ? { ...error, ...{ message: error.message } } : /* istanbul ignore next */ error;
                await actionRepo.giveUp(returnOrderActionAttributes.typeOf, action.id, actionError);
            } catch (__) {
                // 失敗したら仕方ない
            }

            throw new Error(error);
        }

        // アクション完了
        debug('ending action...');
        await actionRepo.complete(returnOrderActionAttributes.typeOf, action.id, {});

        // 潜在アクション
        await onReturn(returnOrderTransactionId, returnOrderActionAttributes)(taskRepo);
    };
}

/**
 * 返品アクション後の処理
 * @param transactionId 注文返品取引ID
 * @param returnActionAttributes 返品アクション属性
 */
function onReturn(transactionId: string, returnActionAttributes: factory.action.transfer.returnAction.order.IAttributes) {
    return async (taskRepo: TaskRepo) => {
        const now = new Date();
        const taskAttributes: factory.task.IAttributes[] = [];

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (returnActionAttributes.potentialActions !== undefined) {
            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore else */
            if (returnActionAttributes.potentialActions.refund !== undefined) {
                // 返金タスク作成
                taskAttributes.push(factory.task.refundCreditCard.createAttributes({
                    status: factory.taskStatus.Ready,
                    runsAt: now, // なるはやで実行
                    remainingNumberOfTries: 10,
                    lastTriedAt: null,
                    numberOfTried: 0,
                    executionResults: [],
                    data: {
                        transactionId: transactionId
                    }
                }));
            }
        }

        // タスク保管
        await Promise.all(taskAttributes.map(async (taskAttribute) => {
            return taskRepo.save(taskAttribute);
        }));
    };
}
