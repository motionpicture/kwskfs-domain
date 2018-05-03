/**
 * 配送サービス
 */

import * as factory from '@motionpicture/kwskfs-factory';
import * as createDebug from 'debug';

import { MongoRepository as ActionRepo } from '../repo/action';
import { MongoRepository as OrderRepo } from '../repo/order';
import { MongoRepository as OwnershipInfoRepo } from '../repo/ownershipInfo';
import { MongoRepository as TaskRepo } from '../repo/task';
import { MongoRepository as TransactionRepo } from '../repo/transaction';

const debug = createDebug('kwskfs-domain:service:delivery');

export type IPlaceOrderTransaction = factory.transaction.placeOrder.ITransaction;

/**
 * 注文を配送する
 * 内部的には所有権を作成する
 * @param transactionId 注文取引ID
 */
// tslint:disable-next-line:max-func-body-length
export function sendOrder(transactionId: string) {
    // tslint:disable-next-line:max-func-body-length
    return async (repos: {
        action: ActionRepo;
        order: OrderRepo;
        ownershipInfo: OwnershipInfoRepo;
        transaction: TransactionRepo;
        task: TaskRepo;
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

        // const authorizeActions = <factory.action.authorize.offer.eventReservation.seat.IAction[]>transaction.object.authorizeActions
        //     .filter((a) => a.actionStatus === factory.actionStatusType.CompletedActionStatus)
        //     .filter((a) => a.object.typeOf === 'Offer')
        //     .filter((a) => a.object.itemOffered.reservedTicket.ticketedSeat !== undefined);
        // if (authorizeActions.length !== 1) {
        //     throw new factory.errors.NotImplemented('Number of seat reservation authorizeAction must be 1.');
        // }

        const orderPotentialActions = potentialActions.order.potentialActions;
        if (orderPotentialActions === undefined) {
            throw new factory.errors.NotFound('order.potentialActions');
        }

        // アクション開始
        const sendOrderActionAttributes = orderPotentialActions.sendOrder;
        const action = await repos.action.start<factory.action.transfer.send.order.IAction>(sendOrderActionAttributes);

        try {
            await Promise.all(transactionResult.ownershipInfos.map(async (ownershipInfo) => {
                await repos.ownershipInfo.save(ownershipInfo);
            }));

            // 注文ステータス変更
            await repos.order.changeStatus(transactionResult.order.orderNumber, factory.orderStatus.OrderDelivered);
        } catch (error) {
            // actionにエラー結果を追加
            try {
                // tslint:disable-next-line:max-line-length no-single-line-block-comment
                const actionError = (error instanceof Error) ? { ...error, ...{ message: error.message } } : /* istanbul ignore next */ error;
                await repos.action.giveUp(sendOrderActionAttributes.typeOf, action.id, actionError);
            } catch (__) {
                // 失敗したら仕方ない
            }

            throw new Error(error);
        }

        // アクション完了
        debug('ending action...');
        await repos.action.complete(sendOrderActionAttributes.typeOf, action.id, {});

        // 潜在アクション
        await onSend(sendOrderActionAttributes)({ task: repos.task });
    };
}

/**
 * 注文配送後のアクション
 * @param transactionId 注文取引ID
 * @param sendOrderActionAttributes 注文配送悪損属性
 */
function onSend(sendOrderActionAttributes: factory.action.transfer.send.order.IAttributes) {
    return async (repos: { task: TaskRepo }) => {
        const potentialActions = sendOrderActionAttributes.potentialActions;
        const now = new Date();
        const taskAttributes: factory.task.IAttributes[] = [];

        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (potentialActions !== undefined) {
            // tslint:disable-next-line:no-single-line-block-comment
            /* istanbul ignore else */
            if (potentialActions.sendEmailMessage !== undefined) {
                // 互換性維持のため、すでにメール送信タスクが存在するかどうか確認し、なければタスク追加
                const sendEmailMessageTaskDoc = await repos.task.taskModel.findOne({
                    name: factory.taskName.SendEmailMessage,
                    'data.actionAttributes.object.identifier': {
                        $exists: true,
                        $eq: potentialActions.sendEmailMessage.object.identifier
                    }
                }).exec();
                // tslint:disable-next-line:no-single-line-block-comment
                /* istanbul ignore else */
                if (sendEmailMessageTaskDoc === null) {
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
        }

        // タスク保管
        await Promise.all(taskAttributes.map(async (taskAttribute) => {
            return repos.task.save(taskAttribute);
        }));
    };
}
