// tslint:disable:no-implicit-dependencies
/**
 * 配送サービステスト
 * @ignore
 */

import * as mongoose from 'mongoose';
import * as assert from 'power-assert';
import * as sinon from 'sinon';
// tslint:disable-next-line:no-require-imports no-var-requires
require('sinon-mongoose');
import * as kwskfs from '../index';

let sandbox: sinon.SinonSandbox;

before(() => {
    sandbox = sinon.sandbox.create();
});

describe('service.delivery.sendOrder()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('注文配送アクションを完了できるはず', async () => {
        const sendOrderActionAttributes = {
            typeOf: kwskfs.factory.actionType.SendAction,
            potentialActions: {
                sendEmailMessage: {
                    typeOf: kwskfs.factory.actionType.SendAction,
                    object: { identifier: 'emailMessageIdentifier' }
                }
            }
        };
        const orderActionAttributes = {
            typeOf: kwskfs.factory.actionType.OrderAction,
            potentialActions: { sendOrder: sendOrderActionAttributes }
        };
        const transaction = {
            id: 'transactionId',
            result: {
                order: {
                    orderNumber: 'orderNumber',
                    acceptedOffers: [
                        { itemOffered: { reservedTicket: {} } }
                    ]
                },
                ownershipInfos: [{ identifier: 'identifier' }]
            },
            potentialActions: { order: orderActionAttributes },
            object: {
                customerContact: {
                    telephone: '+819012345678'
                },
                authorizeActions: [
                    {
                        typeOf: kwskfs.factory.actionType.AuthorizeAction,
                        actionStatus: kwskfs.factory.actionStatusType.CompletedActionStatus,
                        object: { typeOf: kwskfs.factory.action.authorize.seatReservation.ObjectType.SeatReservation },
                        result: { updTmpReserveSeatArgs: {}, updTmpReserveSeatResult: {} }
                    }
                ]
            }
        };
        const action = { typeOf: sendOrderActionAttributes.typeOf, id: 'actionId' };
        const stateReserveResult = null;

        const actionRepo = new kwskfs.repository.Action(mongoose.connection);
        const orderRepo = new kwskfs.repository.Order(mongoose.connection);
        const ownershipInfoRepo = new kwskfs.repository.OwnershipInfo(mongoose.connection);
        const transactionRepo = new kwskfs.repository.Transaction(mongoose.connection);
        const taskRepo = new kwskfs.repository.Task(mongoose.connection);

        sandbox.mock(transactionRepo).expects('findPlaceOrderById').once().resolves(transaction);
        sandbox.mock(taskRepo.taskModel).expects('findOne').once().chain('exec').resolves(null);
        sandbox.mock(actionRepo).expects('start').once().withExactArgs(sendOrderActionAttributes).resolves(action);
        sandbox.mock(actionRepo).expects('complete').once().withArgs(action.typeOf, action.id).resolves(action);
        sandbox.mock(actionRepo).expects('giveUp').never();
        sandbox.mock(kwskfs.COA.services.reserve).expects('stateReserve').once().resolves(stateReserveResult);
        sandbox.mock(kwskfs.COA.services.reserve).expects('updReserve').once().resolves(stateReserveResult);
        // tslint:disable-next-line:no-magic-numbers
        sandbox.mock(ownershipInfoRepo).expects('save').exactly(transaction.result.ownershipInfos.length).resolves();
        sandbox.mock(orderRepo).expects('changeStatus').once().resolves();
        sandbox.mock(taskRepo).expects('save').once().resolves();

        const result = await kwskfs.service.delivery.sendOrder(transaction.id)({
            action: actionRepo,
            order: orderRepo,
            ownershipInfo: ownershipInfoRepo,
            transaction: transactionRepo,
            task: taskRepo
        });

        assert.equal(result, undefined);
        sandbox.verify();
    });

    it('COA本予約済であれば本予約を実行しないはず', async () => {
        const sendOrderActionAttributes = {
            typeOf: kwskfs.factory.actionType.SendAction,
            potentialActions: {
                sendEmailMessage: {
                    typeOf: kwskfs.factory.actionType.SendAction,
                    object: { identifier: 'emailMessageIdentifier' }
                }
            }
        };
        const orderActionAttributes = {
            typeOf: kwskfs.factory.actionType.OrderAction,
            potentialActions: { sendOrder: sendOrderActionAttributes }
        };
        const transaction = {
            id: 'transactionId',
            result: {
                order: {
                    orderNumber: 'orderNumber',
                    acceptedOffers: [
                        { itemOffered: { reservedTicket: {} } }
                    ]
                },
                ownershipInfos: [{ identifier: 'identifier' }]
            },
            potentialActions: { order: orderActionAttributes },
            object: {
                customerContact: {
                    telephone: '+819012345678'
                },
                authorizeActions: [
                    {
                        typeOf: kwskfs.factory.actionType.AuthorizeAction,
                        actionStatus: kwskfs.factory.actionStatusType.CompletedActionStatus,
                        object: { typeOf: kwskfs.factory.action.authorize.seatReservation.ObjectType.SeatReservation },
                        result: { updTmpReserveSeatArgs: {}, updTmpReserveSeatResult: {} }
                    }
                ]
            }
        };
        const action = { typeOf: sendOrderActionAttributes.typeOf, id: 'actionId' };
        const stateReserveResult = {};

        const actionRepo = new kwskfs.repository.Action(mongoose.connection);
        const orderRepo = new kwskfs.repository.Order(mongoose.connection);
        const ownershipInfoRepo = new kwskfs.repository.OwnershipInfo(mongoose.connection);
        const transactionRepo = new kwskfs.repository.Transaction(mongoose.connection);
        const taskRepo = new kwskfs.repository.Task(mongoose.connection);

        sandbox.mock(transactionRepo).expects('findPlaceOrderById').once().resolves(transaction);
        sandbox.mock(taskRepo.taskModel).expects('findOne').once().chain('exec').resolves(null);
        sandbox.mock(actionRepo).expects('start').once().withExactArgs(sendOrderActionAttributes).resolves(action);
        sandbox.mock(actionRepo).expects('complete').once().withArgs(action.typeOf, action.id).resolves(action);
        sandbox.mock(actionRepo).expects('giveUp').never();
        sandbox.mock(kwskfs.COA.services.reserve).expects('stateReserve').once().resolves(stateReserveResult);
        sandbox.mock(kwskfs.COA.services.reserve).expects('updReserve').never();
        // tslint:disable-next-line:no-magic-numbers
        sandbox.mock(ownershipInfoRepo).expects('save').exactly(transaction.result.ownershipInfos.length).resolves();
        sandbox.mock(orderRepo).expects('changeStatus').once().resolves();
        sandbox.mock(taskRepo).expects('save').once().resolves();

        const result = await kwskfs.service.delivery.sendOrder(transaction.id)({
            action: actionRepo,
            order: orderRepo,
            ownershipInfo: ownershipInfoRepo,
            transaction: transactionRepo,
            task: taskRepo
        });

        assert.equal(result, undefined);
        sandbox.verify();
    });

    it('注文取引結果が未定義であればNotFoundエラーとなるはず', async () => {
        const sendOrderActionAttributes = {
            typeOf: kwskfs.factory.actionType.SendAction,
            potentialActions: {
                sendEmailMessage: {
                    typeOf: kwskfs.factory.actionType.SendAction,
                    object: { identifier: 'emailMessageIdentifier' }
                }
            }
        };
        const orderActionAttributes = {
            typeOf: kwskfs.factory.actionType.OrderAction,
            potentialActions: { sendOrder: sendOrderActionAttributes }
        };
        const transaction = {
            id: 'transactionId',
            // result: {
            //     order: {
            //         orderNumber: 'orderNumber',
            //         acceptedOffers: [
            //             { itemOffered: { reservedTicket: {} } }
            //         ]
            //     },
            //     ownershipInfos: [{ identifier: 'identifier' }]
            // },
            potentialActions: { order: orderActionAttributes },
            object: {
                customerContact: {
                    telephone: '+819012345678'
                },
                authorizeActions: [
                    {
                        typeOf: kwskfs.factory.actionType.AuthorizeAction,
                        actionStatus: kwskfs.factory.actionStatusType.CompletedActionStatus,
                        object: { typeOf: kwskfs.factory.action.authorize.seatReservation.ObjectType.SeatReservation },
                        result: { updTmpReserveSeatArgs: {}, updTmpReserveSeatResult: {} }
                    }
                ]
            }
        };

        const actionRepo = new kwskfs.repository.Action(mongoose.connection);
        const orderRepo = new kwskfs.repository.Order(mongoose.connection);
        const ownershipInfoRepo = new kwskfs.repository.OwnershipInfo(mongoose.connection);
        const transactionRepo = new kwskfs.repository.Transaction(mongoose.connection);
        const taskRepo = new kwskfs.repository.Task(mongoose.connection);

        sandbox.mock(transactionRepo).expects('findPlaceOrderById').once().resolves(transaction);
        sandbox.mock(taskRepo.taskModel).expects('findOne').never();
        sandbox.mock(actionRepo).expects('start').never();
        sandbox.mock(ownershipInfoRepo).expects('save').never();
        sandbox.mock(orderRepo).expects('changeStatus').never();
        sandbox.mock(taskRepo).expects('save').never();

        const result = await kwskfs.service.delivery.sendOrder(transaction.id)({
            action: actionRepo,
            order: orderRepo,
            ownershipInfo: ownershipInfoRepo,
            transaction: transactionRepo,
            task: taskRepo
        }).catch((err) => err);

        assert(result instanceof kwskfs.factory.errors.NotFound);
        sandbox.verify();
    });

    it('注文取引の潜在アクションが未定義であればNotFoundエラーとなるはず', async () => {
        const transaction = {
            id: 'transactionId',
            result: {
                order: {
                    orderNumber: 'orderNumber',
                    acceptedOffers: [
                        { itemOffered: { reservedTicket: {} } }
                    ]
                },
                ownershipInfos: [{ identifier: 'identifier' }]
            },
            // potentialActions: { order: orderActionAttributes },
            object: {
                customerContact: {
                    telephone: '+819012345678'
                },
                authorizeActions: [
                    {
                        typeOf: kwskfs.factory.actionType.AuthorizeAction,
                        actionStatus: kwskfs.factory.actionStatusType.CompletedActionStatus,
                        object: { typeOf: kwskfs.factory.action.authorize.seatReservation.ObjectType.SeatReservation },
                        result: { updTmpReserveSeatArgs: {}, updTmpReserveSeatResult: {} }
                    }
                ]
            }
        };

        const actionRepo = new kwskfs.repository.Action(mongoose.connection);
        const orderRepo = new kwskfs.repository.Order(mongoose.connection);
        const ownershipInfoRepo = new kwskfs.repository.OwnershipInfo(mongoose.connection);
        const transactionRepo = new kwskfs.repository.Transaction(mongoose.connection);
        const taskRepo = new kwskfs.repository.Task(mongoose.connection);

        sandbox.mock(transactionRepo).expects('findPlaceOrderById').once().resolves(transaction);
        sandbox.mock(taskRepo.taskModel).expects('findOne').never();
        sandbox.mock(actionRepo).expects('start').never();
        sandbox.mock(ownershipInfoRepo).expects('save').never();
        sandbox.mock(orderRepo).expects('changeStatus').never();
        sandbox.mock(taskRepo).expects('save').never();

        const result = await kwskfs.service.delivery.sendOrder(transaction.id)({
            action: actionRepo,
            order: orderRepo,
            ownershipInfo: ownershipInfoRepo,
            transaction: transactionRepo,
            task: taskRepo
        }).catch((err) => err);

        assert(result instanceof kwskfs.factory.errors.NotFound);
        sandbox.verify();
    });

    it('座席予約承認アクション結果が未定義であればNotFoundエラーとなるはず', async () => {
        const sendOrderActionAttributes = {
            typeOf: kwskfs.factory.actionType.SendAction,
            potentialActions: {
                sendEmailMessage: {
                    typeOf: kwskfs.factory.actionType.SendAction,
                    object: { identifier: 'emailMessageIdentifier' }
                }
            }
        };
        const orderActionAttributes = {
            typeOf: kwskfs.factory.actionType.OrderAction,
            potentialActions: { sendOrder: sendOrderActionAttributes }
        };
        const transaction = {
            id: 'transactionId',
            result: {
                order: {
                    orderNumber: 'orderNumber',
                    acceptedOffers: [
                        { itemOffered: { reservedTicket: {} } }
                    ]
                },
                ownershipInfos: [{ identifier: 'identifier' }]
            },
            potentialActions: { order: orderActionAttributes },
            object: {
                customerContact: {
                    telephone: '+819012345678'
                },
                authorizeActions: [
                    {
                        typeOf: kwskfs.factory.actionType.AuthorizeAction,
                        actionStatus: kwskfs.factory.actionStatusType.CompletedActionStatus,
                        object: { typeOf: kwskfs.factory.action.authorize.seatReservation.ObjectType.SeatReservation }
                        // result: { updTmpReserveSeatArgs: {}, updTmpReserveSeatResult: {} }
                    }
                ]
            }
        };

        const actionRepo = new kwskfs.repository.Action(mongoose.connection);
        const orderRepo = new kwskfs.repository.Order(mongoose.connection);
        const ownershipInfoRepo = new kwskfs.repository.OwnershipInfo(mongoose.connection);
        const transactionRepo = new kwskfs.repository.Transaction(mongoose.connection);
        const taskRepo = new kwskfs.repository.Task(mongoose.connection);

        sandbox.mock(transactionRepo).expects('findPlaceOrderById').once().resolves(transaction);
        sandbox.mock(taskRepo.taskModel).expects('findOne').never();
        sandbox.mock(actionRepo).expects('start').never();
        sandbox.mock(ownershipInfoRepo).expects('save').never();
        sandbox.mock(orderRepo).expects('changeStatus').never();
        sandbox.mock(taskRepo).expects('save').never();

        const result = await kwskfs.service.delivery.sendOrder(transaction.id)({
            action: actionRepo,
            order: orderRepo,
            ownershipInfo: ownershipInfoRepo,
            transaction: transactionRepo,
            task: taskRepo
        }).catch((err) => err);

        assert(result instanceof kwskfs.factory.errors.NotFound);
        sandbox.verify();
    });

    it('座席予約承認アクションが2つ以上あればNotImplementedエラーとなるはず', async () => {
        const sendOrderActionAttributes = {
            typeOf: kwskfs.factory.actionType.SendAction,
            potentialActions: {
                sendEmailMessage: {
                    typeOf: kwskfs.factory.actionType.SendAction,
                    object: { identifier: 'emailMessageIdentifier' }
                }
            }
        };
        const orderActionAttributes = {
            typeOf: kwskfs.factory.actionType.OrderAction,
            potentialActions: { sendOrder: sendOrderActionAttributes }
        };
        const transaction = {
            id: 'transactionId',
            result: {
                order: {
                    orderNumber: 'orderNumber',
                    acceptedOffers: [
                        { itemOffered: { reservedTicket: {} } }
                    ]
                },
                ownershipInfos: [{ identifier: 'identifier' }]
            },
            potentialActions: { order: orderActionAttributes },
            object: {
                customerContact: {
                    telephone: '+819012345678'
                },
                authorizeActions: [
                    {
                        typeOf: kwskfs.factory.actionType.AuthorizeAction,
                        actionStatus: kwskfs.factory.actionStatusType.CompletedActionStatus,
                        object: { typeOf: kwskfs.factory.action.authorize.seatReservation.ObjectType.SeatReservation },
                        result: { updTmpReserveSeatArgs: {}, updTmpReserveSeatResult: {} }
                    },
                    {
                        typeOf: kwskfs.factory.actionType.AuthorizeAction,
                        actionStatus: kwskfs.factory.actionStatusType.CompletedActionStatus,
                        object: { typeOf: kwskfs.factory.action.authorize.seatReservation.ObjectType.SeatReservation },
                        result: { updTmpReserveSeatArgs: {}, updTmpReserveSeatResult: {} }
                    }
                ]
            }
        };

        const actionRepo = new kwskfs.repository.Action(mongoose.connection);
        const orderRepo = new kwskfs.repository.Order(mongoose.connection);
        const ownershipInfoRepo = new kwskfs.repository.OwnershipInfo(mongoose.connection);
        const transactionRepo = new kwskfs.repository.Transaction(mongoose.connection);
        const taskRepo = new kwskfs.repository.Task(mongoose.connection);

        sandbox.mock(transactionRepo).expects('findPlaceOrderById').once().resolves(transaction);
        sandbox.mock(taskRepo.taskModel).expects('findOne').never();
        sandbox.mock(actionRepo).expects('start').never();
        sandbox.mock(ownershipInfoRepo).expects('save').never();
        sandbox.mock(orderRepo).expects('changeStatus').never();
        sandbox.mock(taskRepo).expects('save').never();

        const result = await kwskfs.service.delivery.sendOrder(transaction.id)({
            action: actionRepo,
            order: orderRepo,
            ownershipInfo: ownershipInfoRepo,
            transaction: transactionRepo,
            task: taskRepo
        }).catch((err) => err);

        assert(result instanceof kwskfs.factory.errors.NotImplemented);
        sandbox.verify();
    });

    it('注文取引に購入者連絡先が未定義であればNotFoundエラーとなるはず', async () => {
        const sendOrderActionAttributes = {
            typeOf: kwskfs.factory.actionType.SendAction,
            potentialActions: {
                sendEmailMessage: {
                    typeOf: kwskfs.factory.actionType.SendAction,
                    object: { identifier: 'emailMessageIdentifier' }
                }
            }
        };
        const orderActionAttributes = {
            typeOf: kwskfs.factory.actionType.OrderAction,
            potentialActions: { sendOrder: sendOrderActionAttributes }
        };
        const transaction = {
            id: 'transactionId',
            result: {
                order: {
                    orderNumber: 'orderNumber',
                    acceptedOffers: [
                        { itemOffered: { reservedTicket: {} } }
                    ]
                },
                ownershipInfos: [{ identifier: 'identifier' }]
            },
            potentialActions: { order: orderActionAttributes },
            object: {
                // customerContact: {
                //     telephone: '+819012345678'
                // },
                authorizeActions: [
                    {
                        typeOf: kwskfs.factory.actionType.AuthorizeAction,
                        actionStatus: kwskfs.factory.actionStatusType.CompletedActionStatus,
                        object: { typeOf: kwskfs.factory.action.authorize.seatReservation.ObjectType.SeatReservation },
                        result: { updTmpReserveSeatArgs: {}, updTmpReserveSeatResult: {} }
                    }
                ]
            }
        };

        const actionRepo = new kwskfs.repository.Action(mongoose.connection);
        const orderRepo = new kwskfs.repository.Order(mongoose.connection);
        const ownershipInfoRepo = new kwskfs.repository.OwnershipInfo(mongoose.connection);
        const transactionRepo = new kwskfs.repository.Transaction(mongoose.connection);
        const taskRepo = new kwskfs.repository.Task(mongoose.connection);

        sandbox.mock(transactionRepo).expects('findPlaceOrderById').once().resolves(transaction);
        sandbox.mock(taskRepo.taskModel).expects('findOne').never();
        sandbox.mock(actionRepo).expects('start').never();
        sandbox.mock(ownershipInfoRepo).expects('save').never();
        sandbox.mock(orderRepo).expects('changeStatus').never();
        sandbox.mock(taskRepo).expects('save').never();

        const result = await kwskfs.service.delivery.sendOrder(transaction.id)({
            action: actionRepo,
            order: orderRepo,
            ownershipInfo: ownershipInfoRepo,
            transaction: transactionRepo,
            task: taskRepo
        }).catch((err) => err);

        assert(result instanceof kwskfs.factory.errors.NotFound);
        sandbox.verify();
    });

    it('予約状態抽出に失敗すればアクションにエラー結果が追加されるはず', async () => {
        const sendOrderActionAttributes = {
            typeOf: kwskfs.factory.actionType.SendAction,
            potentialActions: {
                sendEmailMessage: {
                    typeOf: kwskfs.factory.actionType.SendAction,
                    object: { identifier: 'emailMessageIdentifier' }
                }
            }
        };
        const orderActionAttributes = {
            typeOf: kwskfs.factory.actionType.OrderAction,
            potentialActions: { sendOrder: sendOrderActionAttributes }
        };
        const transaction = {
            id: 'transactionId',
            result: {
                order: {
                    orderNumber: 'orderNumber',
                    acceptedOffers: [
                        { itemOffered: { reservedTicket: {} } }
                    ]
                },
                ownershipInfos: [{ identifier: 'identifier' }]
            },
            potentialActions: { order: orderActionAttributes },
            object: {
                customerContact: {
                    telephone: '+819012345678'
                },
                authorizeActions: [
                    {
                        typeOf: kwskfs.factory.actionType.AuthorizeAction,
                        actionStatus: kwskfs.factory.actionStatusType.CompletedActionStatus,
                        object: { typeOf: kwskfs.factory.action.authorize.seatReservation.ObjectType.SeatReservation },
                        result: { updTmpReserveSeatArgs: {}, updTmpReserveSeatResult: {} }
                    }
                ]
            }
        };
        const action = { typeOf: sendOrderActionAttributes.typeOf, id: 'actionId' };
        const stateReserveResult = new Error('stateReserveError');

        const actionRepo = new kwskfs.repository.Action(mongoose.connection);
        const orderRepo = new kwskfs.repository.Order(mongoose.connection);
        const ownershipInfoRepo = new kwskfs.repository.OwnershipInfo(mongoose.connection);
        const transactionRepo = new kwskfs.repository.Transaction(mongoose.connection);
        const taskRepo = new kwskfs.repository.Task(mongoose.connection);

        sandbox.mock(transactionRepo).expects('findPlaceOrderById').once().resolves(transaction);
        sandbox.mock(actionRepo).expects('start').once().withExactArgs(sendOrderActionAttributes).resolves(action);
        sandbox.mock(actionRepo).expects('complete').never();
        sandbox.mock(actionRepo).expects('giveUp').once().withArgs(action.typeOf, action.id).resolves(action);
        sandbox.mock(kwskfs.COA.services.reserve).expects('stateReserve').once().rejects(stateReserveResult);
        sandbox.mock(kwskfs.COA.services.reserve).expects('updReserve').never();
        // tslint:disable-next-line:no-magic-numbers
        sandbox.mock(ownershipInfoRepo).expects('save').never();
        sandbox.mock(orderRepo).expects('changeStatus').never();
        sandbox.mock(taskRepo.taskModel).expects('findOne').never();
        sandbox.mock(taskRepo).expects('save').never();

        const result = await kwskfs.service.delivery.sendOrder(transaction.id)({
            action: actionRepo,
            order: orderRepo,
            ownershipInfo: ownershipInfoRepo,
            transaction: transactionRepo,
            task: taskRepo
        }).catch((err) => err);

        assert.deepEqual(result, stateReserveResult);
        sandbox.verify();
    });

    it('注文アクションの潜在アクションが未定義であればNotFoundエラーとなるはず', async () => {
        const orderActionAttributes = {
            typeOf: kwskfs.factory.actionType.OrderAction
            // potentialActions: { sendOrder: sendOrderActionAttributes }
        };
        const transaction = {
            id: 'transactionId',
            result: {
                order: {
                    orderNumber: 'orderNumber',
                    acceptedOffers: [
                        { itemOffered: { reservedTicket: {} } }
                    ]
                },
                ownershipInfos: [{ identifier: 'identifier' }]
            },
            potentialActions: { order: orderActionAttributes },
            object: {
                customerContact: {
                    telephone: '+819012345678'
                },
                authorizeActions: [
                    {
                        typeOf: kwskfs.factory.actionType.AuthorizeAction,
                        actionStatus: kwskfs.factory.actionStatusType.CompletedActionStatus,
                        object: { typeOf: kwskfs.factory.action.authorize.seatReservation.ObjectType.SeatReservation },
                        result: { updTmpReserveSeatArgs: {}, updTmpReserveSeatResult: {} }
                    }
                ]
            }
        };

        const actionRepo = new kwskfs.repository.Action(mongoose.connection);
        const orderRepo = new kwskfs.repository.Order(mongoose.connection);
        const ownershipInfoRepo = new kwskfs.repository.OwnershipInfo(mongoose.connection);
        const transactionRepo = new kwskfs.repository.Transaction(mongoose.connection);
        const taskRepo = new kwskfs.repository.Task(mongoose.connection);

        sandbox.mock(transactionRepo).expects('findPlaceOrderById').once().resolves(transaction);
        sandbox.mock(taskRepo.taskModel).expects('findOne').never();
        sandbox.mock(actionRepo).expects('start').never();
        sandbox.mock(ownershipInfoRepo).expects('save').never();
        sandbox.mock(orderRepo).expects('changeStatus').never();
        sandbox.mock(taskRepo).expects('save').never();

        const result = await kwskfs.service.delivery.sendOrder(transaction.id)({
            action: actionRepo,
            order: orderRepo,
            ownershipInfo: ownershipInfoRepo,
            transaction: transactionRepo,
            task: taskRepo
        }).catch((err) => err);

        assert(result instanceof kwskfs.factory.errors.NotFound);
        sandbox.verify();
    });
});
