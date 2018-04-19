/**
 * タスクファンクションサービス
 * タスク名ごとに、実行するファンクションをひとつずつ定義しています
 * @namespace service.taskFunctions
 */

import * as factory from '@motionpicture/kwskfs-factory';
import * as pecorinoapi from '@motionpicture/pecorino-api-nodejs-client';
import * as mongoose from 'mongoose';

import { MongoRepository as ActionRepo } from '../repo/action';
import { MongoRepository as OrderRepo } from '../repo/order';
import { MongoRepository as OwnershipInfoRepo } from '../repo/ownershipInfo';
import { MongoRepository as TaskRepo } from '../repo/task';
import { MongoRepository as TransactionRepo } from '../repo/transaction';

import * as DeliveryService from '../service/delivery';
import * as NotificationService from '../service/notification';
import * as OrderService from '../service/order';
import * as PaymentService from '../service/payment';
import * as StockService from '../service/stock';

export type IOperation<T> = (settings: {
    connection: mongoose.Connection;
    pecorinoAuthClient?: pecorinoapi.auth.ClientCredentials;
}) => Promise<T>;

export function sendEmailMessage(
    data: factory.task.sendEmailMessage.IData
): IOperation<void> {
    return async (settings: {
        connection: mongoose.Connection;
        pecorinoAuthClient?: pecorinoapi.auth.ClientCredentials;
    }) => {
        const actionRepo = new ActionRepo(settings.connection);
        await NotificationService.sendEmailMessage(data.actionAttributes)({ action: actionRepo });
    };
}

export function cancelSeatReservation(
    data: factory.task.cancelSeatReservation.IData
): IOperation<void> {
    return async (settings: {
        connection: mongoose.Connection;
        pecorinoAuthClient?: pecorinoapi.auth.ClientCredentials;
    }) => {
        const actionRepo = new ActionRepo(settings.connection);
        await StockService.cancelSeatReservationAuth(data.transactionId)({ action: actionRepo });
    };
}

export function cancelCreditCard(
    data: factory.task.cancelCreditCard.IData
): IOperation<void> {
    return async (settings: {
        connection: mongoose.Connection;
        pecorinoAuthClient?: pecorinoapi.auth.ClientCredentials;
    }) => {
        const actionRepo = new ActionRepo(settings.connection);
        await PaymentService.cancelCreditCardAuth(data.transactionId)({ action: actionRepo });
    };
}

export function cancelMvtk(
    data: factory.task.cancelMvtk.IData
): IOperation<void> {
    return async (__: {
        connection: mongoose.Connection;
        pecorinoAuthClient?: pecorinoapi.auth.ClientCredentials;
    }) => {
        await PaymentService.cancelMvtk(data.transactionId)();
    };
}

export function payCreditCard(
    data: factory.task.payCreditCard.IData
): IOperation<void> {
    return async (settings: {
        connection: mongoose.Connection;
        pecorinoAuthClient?: pecorinoapi.auth.ClientCredentials;
    }) => {
        const actionRepo = new ActionRepo(settings.connection);
        const transactionRepo = new TransactionRepo(settings.connection);
        await PaymentService.payCreditCard(data.transactionId)({
            action: actionRepo,
            transaction: transactionRepo
        });
    };
}

export function useMvtk(
    data: factory.task.useMvtk.IData
): IOperation<void> {
    return async (settings: {
        connection: mongoose.Connection;
        pecorinoAuthClient?: pecorinoapi.auth.ClientCredentials;
    }) => {
        const actionRepo = new ActionRepo(settings.connection);
        const transactionRepo = new TransactionRepo(settings.connection);
        await PaymentService.useMvtk(data.transactionId)({
            action: actionRepo,
            transaction: transactionRepo
        });
    };
}

export function payPecorino(
    data: factory.task.payPecorino.IData
): IOperation<void> {
    return async (settings: {
        connection: mongoose.Connection;
        pecorinoAuthClient?: pecorinoapi.auth.ClientCredentials;
    }) => {
        if (settings.pecorinoAuthClient === undefined) {
            throw new Error('settings.pecorinoAuthClient undefined.');
        }

        const actionRepo = new ActionRepo(settings.connection);
        const transactionRepo = new TransactionRepo(settings.connection);
        await PaymentService.payPecorino(data.transactionId)({
            action: actionRepo,
            transaction: transactionRepo,
            pecorinoAuthClient: settings.pecorinoAuthClient
        });
    };
}

export function placeOrder(
    data: factory.task.placeOrder.IData
): IOperation<void> {
    return async (settings: {
        connection: mongoose.Connection;
        pecorinoAuthClient?: pecorinoapi.auth.ClientCredentials;
    }) => {
        const actionRepo = new ActionRepo(settings.connection);
        const orderRepo = new OrderRepo(settings.connection);
        const transactionRepo = new TransactionRepo(settings.connection);
        const taskRepo = new TaskRepo(settings.connection);
        await OrderService.createFromTransaction(data.transactionId)({
            action: actionRepo,
            order: orderRepo,
            transaction: transactionRepo,
            task: taskRepo
        });
    };
}

export function refundCreditCard(
    data: factory.task.refundCreditCard.IData
): IOperation<void> {
    return async (settings: {
        connection: mongoose.Connection;
        pecorinoAuthClient?: pecorinoapi.auth.ClientCredentials;
    }) => {
        const actionRepo = new ActionRepo(settings.connection);
        const transactionRepo = new TransactionRepo(settings.connection);
        const taskRepo = new TaskRepo(settings.connection);
        await PaymentService.refundCreditCard(data.transactionId)({
            action: actionRepo,
            transaction: transactionRepo,
            task: taskRepo
        });
    };
}

export function returnOrder(
    data: factory.task.returnOrder.IData
): IOperation<void> {
    return async (settings: {
        connection: mongoose.Connection;
        pecorinoAuthClient?: pecorinoapi.auth.ClientCredentials;
    }) => {
        const actionRepo = new ActionRepo(settings.connection);
        const orderRepo = new OrderRepo(settings.connection);
        const ownershipInfoRepo = new OwnershipInfoRepo(settings.connection);
        const transactionRepo = new TransactionRepo(settings.connection);
        const taskRepo = new TaskRepo(settings.connection);
        await OrderService.cancelReservations(data.transactionId)(actionRepo, orderRepo, ownershipInfoRepo, transactionRepo, taskRepo);
    };
}

export function sendOrder(
    data: factory.task.returnOrder.IData
): IOperation<void> {
    return async (settings: {
        connection: mongoose.Connection;
        pecorinoAuthClient?: pecorinoapi.auth.ClientCredentials;
    }) => {
        const actionRepo = new ActionRepo(settings.connection);
        const orderRepo = new OrderRepo(settings.connection);
        const ownershipInfoRepo = new OwnershipInfoRepo(settings.connection);
        const transactionRepo = new TransactionRepo(settings.connection);
        const taskRepo = new TaskRepo(settings.connection);
        await DeliveryService.sendOrder(data.transactionId)({
            action: actionRepo,
            order: orderRepo,
            ownershipInfo: ownershipInfoRepo,
            transaction: transactionRepo,
            task: taskRepo
        });
    };
}
