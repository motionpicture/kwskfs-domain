// tslint:disable:no-implicit-dependencies
/**
 * sales service test
 * @ignore
 */

import * as assert from 'power-assert';
import * as sinon from 'sinon';
import * as kwskfs from '../index';

let sandbox: sinon.SinonSandbox;
let existingTransaction: any;

before(() => {
    sandbox = sinon.sandbox.create();
    existingTransaction = {
        id: '123',
        agent: { typeOf: 'Person' },
        seller: { typeOf: kwskfs.factory.organizationType.SportsTeam },
        object: {
            customerContact: {},
            authorizeActions: [
                {
                    id: 'actionId',
                    actionStatus: kwskfs.factory.actionStatusType.CompletedActionStatus,
                    purpose: {},
                    object: {
                        typeOf: kwskfs.factory.action.authorize.creditCard.ObjectType.CreditCard,
                        amount: 123,
                        orderId: 'orderId'
                    },
                    result: {
                        price: 123,
                        entryTranArgs: {},
                        execTranArgs: {}
                    }
                }
            ]
        },
        result: {
            order: { orderNumber: 'orderNumber' }
        },
        potentialActions: {
            order: {
                typeOf: kwskfs.factory.actionType.OrderAction,
                potentialActions: {
                    payCreditCard: { typeOf: kwskfs.factory.actionType.PayAction },
                    payPecorino: { typeOf: kwskfs.factory.actionType.PayAction }
                }
            }
        }
    };
});

describe('cancelCreditCardAuth()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('repositoryとGMOの状態が正常であれば、エラーにならないはず', async () => {
        const authorizeActions = [
            {
                id: 'actionId',
                actionStatus: kwskfs.factory.actionStatusType.CompletedActionStatus,
                object: { typeOf: kwskfs.factory.action.authorize.creditCard.ObjectType.CreditCard },
                purpose: {},
                result: {
                    entryTranArgs: {},
                    execTranArgs: {}
                }
            }
        ];
        const actionRepo = new kwskfs.repository.Action(kwskfs.mongoose.connection);

        sandbox.mock(actionRepo).expects('findAuthorizeByTransactionId').once()
            .withExactArgs(existingTransaction.id).resolves(authorizeActions);
        sandbox.mock(kwskfs.GMO.services.credit).expects('alterTran').once().resolves();

        const result = await kwskfs.service.payment.cancelCreditCardAuth(existingTransaction.id)({ action: actionRepo });

        assert.equal(result, undefined);
        sandbox.verify();
    });
});

describe('payPecorino()', () => {
    afterEach(() => {
        sandbox.restore();
    });
});

describe('payCreditCard()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('仮売上状態であれば、実売上に成功するはず', async () => {
        const searchTradeResult = { jobCd: kwskfs.GMO.utils.util.JobCd.Auth };
        const action = { id: 'actionId' };

        const actionRepo = new kwskfs.repository.Action(kwskfs.mongoose.connection);
        const transactionRepo = new kwskfs.repository.Transaction(kwskfs.mongoose.connection);

        sandbox.mock(actionRepo).expects('start').once()
            .withExactArgs(existingTransaction.potentialActions.order.potentialActions.payCreditCard).resolves(action);
        sandbox.mock(actionRepo).expects('complete').once()
            .withArgs(existingTransaction.potentialActions.order.potentialActions.payCreditCard.typeOf, action.id).resolves(action);
        sandbox.mock(actionRepo).expects('giveUp').never();
        sandbox.mock(transactionRepo).expects('findPlaceOrderById').once()
            .withExactArgs(existingTransaction.id).resolves(existingTransaction);
        sandbox.mock(kwskfs.GMO.services.credit).expects('searchTrade').once().resolves(searchTradeResult);
        sandbox.mock(kwskfs.GMO.services.credit).expects('alterTran').once().resolves();

        const result = await kwskfs.service.payment.payCreditCard(existingTransaction.id)({
            action: actionRepo,
            transaction: transactionRepo
        });

        assert.equal(result, undefined);
        sandbox.verify();
    });

    it('注文取引結果が未定義であればNotFoundエラーとなるはず', async () => {
        const transaction = { ...existingTransaction, result: undefined };

        const actionRepo = new kwskfs.repository.Action(kwskfs.mongoose.connection);
        const transactionRepo = new kwskfs.repository.Transaction(kwskfs.mongoose.connection);

        sandbox.mock(transactionRepo).expects('findPlaceOrderById').once()
            .withExactArgs(transaction.id).resolves(transaction);
        sandbox.mock(actionRepo).expects('start').never();

        const result = await kwskfs.service.payment.payCreditCard(transaction.id)({
            action: actionRepo,
            transaction: transactionRepo
        }).catch((err) => err);

        assert(result instanceof kwskfs.factory.errors.NotFound);
        sandbox.verify();
    });

    it('注文取引の潜在アクションが未定義であればNotFoundエラーとなるはず', async () => {
        const transaction = { ...existingTransaction, potentialActions: undefined };

        const actionRepo = new kwskfs.repository.Action(kwskfs.mongoose.connection);
        const transactionRepo = new kwskfs.repository.Transaction(kwskfs.mongoose.connection);

        sandbox.mock(transactionRepo).expects('findPlaceOrderById').once()
            .withExactArgs(transaction.id).resolves(transaction);
        sandbox.mock(actionRepo).expects('start').never();

        const result = await kwskfs.service.payment.payCreditCard(transaction.id)({
            action: actionRepo,
            transaction: transactionRepo
        }).catch((err) => err);

        assert(result instanceof kwskfs.factory.errors.NotFound);
        sandbox.verify();
    });

    it('注文アクションの潜在アクションが未定義であれば、NotFoundエラーとなるはず', async () => {
        const transaction = {
            ...existingTransaction,
            potentialActions: {
                order: {
                    typeOf: 'actionType'
                    // potentialActions: {}
                }
            }
        };

        const actionRepo = new kwskfs.repository.Action(kwskfs.mongoose.connection);
        const transactionRepo = new kwskfs.repository.Transaction(kwskfs.mongoose.connection);

        sandbox.mock(transactionRepo).expects('findPlaceOrderById').once().withExactArgs(transaction.id).resolves(transaction);
        sandbox.mock(actionRepo).expects('start').never();

        const result = await kwskfs.service.payment.payCreditCard(transaction.id)({
            action: actionRepo,
            transaction: transactionRepo
        })
            .catch((err) => err);

        assert(result instanceof kwskfs.factory.errors.NotFound);
        sandbox.verify();
    });

    it('すでに実売上済であれば、実売上リクエストは実行されないはず', async () => {
        const searchTradeResult = { jobCd: kwskfs.GMO.utils.util.JobCd.Sales };
        const action = { id: 'actionId' };

        const actionRepo = new kwskfs.repository.Action(kwskfs.mongoose.connection);
        const transactionRepo = new kwskfs.repository.Transaction(kwskfs.mongoose.connection);

        sandbox.mock(actionRepo).expects('start').once()
            .withExactArgs(existingTransaction.potentialActions.order.potentialActions.payCreditCard).resolves(action);
        sandbox.mock(actionRepo).expects('complete').once()
            .withArgs(existingTransaction.potentialActions.order.potentialActions.payCreditCard.typeOf, action.id).resolves(action);
        sandbox.mock(actionRepo).expects('giveUp').never();
        sandbox.mock(transactionRepo).expects('findPlaceOrderById').once()
            .withExactArgs(existingTransaction.id).resolves(existingTransaction);
        sandbox.mock(kwskfs.GMO.services.credit).expects('searchTrade').once().resolves(searchTradeResult);
        sandbox.mock(kwskfs.GMO.services.credit).expects('alterTran').never();

        const result = await kwskfs.service.payment.payCreditCard(existingTransaction.id)({
            action: actionRepo,
            transaction: transactionRepo
        });

        assert.equal(result, undefined);
        sandbox.verify();
    });

    it('GMO実売上に失敗すればアクションにエラー結果が追加されるはず', async () => {
        const searchTradeResult = { jobCd: kwskfs.GMO.utils.util.JobCd.Auth };
        const action = { id: 'actionId' };
        const alterTranResult = new Error('alterTranError');

        const actionRepo = new kwskfs.repository.Action(kwskfs.mongoose.connection);
        const transactionRepo = new kwskfs.repository.Transaction(kwskfs.mongoose.connection);

        sandbox.mock(actionRepo).expects('start').once()
            .withExactArgs(existingTransaction.potentialActions.order.potentialActions.payCreditCard).resolves(action);
        sandbox.mock(actionRepo).expects('giveUp')
            .withArgs(existingTransaction.potentialActions.order.potentialActions.payCreditCard.typeOf, action.id).resolves(action);
        sandbox.mock(actionRepo).expects('complete').never();
        sandbox.mock(transactionRepo).expects('findPlaceOrderById').once()
            .withExactArgs(existingTransaction.id).resolves(existingTransaction);
        sandbox.mock(kwskfs.GMO.services.credit).expects('searchTrade').once().resolves(searchTradeResult);
        sandbox.mock(kwskfs.GMO.services.credit).expects('alterTran').once().rejects(alterTranResult);

        const result = await kwskfs.service.payment.payCreditCard(existingTransaction.id)({
            action: actionRepo,
            transaction: transactionRepo
        }).catch((err) => err);

        assert.deepEqual(result, alterTranResult);
        sandbox.verify();
    });

    it('注文アクションの潜在アクションにクレジットカード決済アクションがなければ何もしない', async () => {
        const placeOrderTransaction = { ...existingTransaction };
        placeOrderTransaction.potentialActions.order.potentialActions.payCreditCard = undefined;

        const actionRepo = new kwskfs.repository.Action(kwskfs.mongoose.connection);
        const transactionRepo = new kwskfs.repository.Transaction(kwskfs.mongoose.connection);

        sandbox.mock(transactionRepo).expects('findPlaceOrderById').once()
            .withExactArgs(placeOrderTransaction.id).resolves(placeOrderTransaction);
        sandbox.mock(actionRepo).expects('start').never();

        const result = await kwskfs.service.payment.payCreditCard(placeOrderTransaction.id)({
            action: actionRepo,
            transaction: transactionRepo
        });

        assert.equal(result, undefined);
        sandbox.verify();
    });

});

describe('refundCreditCard()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('実売上状態であれば売上取消するはず', async () => {
        const placeOrderTransaction = { ...existingTransaction };
        const refundActionAttributes = {
            typeOf: kwskfs.factory.actionType.RefundAction,
            potentialActions: {
                sendEmailMessage: {
                    typeOf: kwskfs.factory.actionType.SendAction
                }
            }
        };
        const returnOrderTransaction = {
            id: 'returnOrderTransactionId',
            typeOf: kwskfs.factory.transactionType.ReturnOrder,
            object: { transaction: placeOrderTransaction },
            potentialActions: {
                returnOrder: {
                    potentialActions: {
                        refund: refundActionAttributes
                    }
                }
            }
        };
        const action = { typeOf: refundActionAttributes.typeOf, id: 'actionId' };
        const searchTradeResult = { status: kwskfs.GMO.utils.util.Status.Sales };

        const actionRepo = new kwskfs.repository.Action(kwskfs.mongoose.connection);
        const transactionRepo = new kwskfs.repository.Transaction(kwskfs.mongoose.connection);
        const taskRepo = new kwskfs.repository.Task(kwskfs.mongoose.connection);

        sandbox.mock(transactionRepo).expects('findReturnOrderById').once()
            .withExactArgs(returnOrderTransaction.id).resolves(returnOrderTransaction);
        sandbox.mock(actionRepo).expects('start').once()
            .withExactArgs(refundActionAttributes).resolves(action);
        sandbox.mock(actionRepo).expects('complete').once()
            .withArgs(action.typeOf, action.id).resolves(action);
        sandbox.mock(actionRepo).expects('giveUp').never();
        sandbox.mock(kwskfs.GMO.services.credit).expects('searchTrade').once().resolves(searchTradeResult);
        sandbox.mock(kwskfs.GMO.services.credit).expects('alterTran').once().resolves();
        sandbox.mock(taskRepo).expects('save').once();

        const result = await kwskfs.service.payment.refundCreditCard(returnOrderTransaction.id)({
            action: actionRepo,
            transaction: transactionRepo,
            task: taskRepo
        });

        assert.equal(result, undefined);
        sandbox.verify();
    });

    it('返品取引の潜在アクションが未定義であればNotFoundエラーとなるはず', async () => {
        const placeOrderTransaction = { ...existingTransaction };
        const returnOrderTransaction = {
            id: 'returnOrderTransactionId',
            typeOf: kwskfs.factory.transactionType.ReturnOrder,
            object: { transaction: placeOrderTransaction }
            // potentialActions: {
            //     returnOrder: {
            //         potentialActions: {
            //             refund: refundActionAttributes
            //         }
            //     }
            // }
        };

        const actionRepo = new kwskfs.repository.Action(kwskfs.mongoose.connection);
        const transactionRepo = new kwskfs.repository.Transaction(kwskfs.mongoose.connection);
        const taskRepo = new kwskfs.repository.Task(kwskfs.mongoose.connection);

        sandbox.mock(transactionRepo).expects('findReturnOrderById').once()
            .withExactArgs(returnOrderTransaction.id).resolves(returnOrderTransaction);
        sandbox.mock(actionRepo).expects('start').never();

        const result = await kwskfs.service.payment.refundCreditCard(returnOrderTransaction.id)({
            action: actionRepo,
            transaction: transactionRepo,
            task: taskRepo
        }).catch((err) => err);

        assert(result instanceof kwskfs.factory.errors.NotFound);
        sandbox.verify();
    });

    it('注文取引結果が未定義であればNotFoundエラーとなるはず', async () => {
        const placeOrderTransaction = { ...existingTransaction, result: undefined };
        const refundActionAttributes = {
            typeOf: kwskfs.factory.actionType.RefundAction,
            potentialActions: {
                sendEmailMessage: {
                    typeOf: kwskfs.factory.actionType.SendAction
                }
            }
        };
        const returnOrderTransaction = {
            id: 'returnOrderTransactionId',
            typeOf: kwskfs.factory.transactionType.ReturnOrder,
            object: { transaction: placeOrderTransaction },
            potentialActions: {
                returnOrder: {
                    potentialActions: {
                        refund: refundActionAttributes
                    }
                }
            }
        };

        const actionRepo = new kwskfs.repository.Action(kwskfs.mongoose.connection);
        const transactionRepo = new kwskfs.repository.Transaction(kwskfs.mongoose.connection);
        const taskRepo = new kwskfs.repository.Task(kwskfs.mongoose.connection);

        sandbox.mock(transactionRepo).expects('findReturnOrderById').once()
            .withExactArgs(returnOrderTransaction.id).resolves(returnOrderTransaction);
        sandbox.mock(actionRepo).expects('start').never();

        const result = await kwskfs.service.payment.refundCreditCard(returnOrderTransaction.id)({
            action: actionRepo,
            transaction: transactionRepo,
            task: taskRepo
        }).catch((err) => err);

        assert(result instanceof kwskfs.factory.errors.NotFound);
        sandbox.verify();
    });

    it('注文返品アクションの潜在アクションが未定義であればNotFoundエラーとなるはず', async () => {
        const placeOrderTransaction = { ...existingTransaction };
        const returnOrderTransaction = {
            id: 'returnOrderTransactionId',
            typeOf: kwskfs.factory.transactionType.ReturnOrder,
            object: { transaction: placeOrderTransaction },
            potentialActions: {
                returnOrder: {}
            }
        };

        const actionRepo = new kwskfs.repository.Action(kwskfs.mongoose.connection);
        const transactionRepo = new kwskfs.repository.Transaction(kwskfs.mongoose.connection);
        const taskRepo = new kwskfs.repository.Task(kwskfs.mongoose.connection);

        sandbox.mock(transactionRepo).expects('findReturnOrderById').once()
            .withExactArgs(returnOrderTransaction.id).resolves(returnOrderTransaction);
        sandbox.mock(actionRepo).expects('start').never();

        const result = await kwskfs.service.payment.refundCreditCard(returnOrderTransaction.id)({
            action: actionRepo,
            transaction: transactionRepo,
            task: taskRepo
        }).catch((err) => err);

        assert(result instanceof kwskfs.factory.errors.NotFound);
        sandbox.verify();
    });

    it('売上取消状態であれば状態変更しないはず', async () => {
        const placeOrderTransaction = { ...existingTransaction };
        const refundActionAttributes = {
            typeOf: kwskfs.factory.actionType.RefundAction,
            potentialActions: {
                sendEmailMessage: {
                    typeOf: kwskfs.factory.actionType.SendAction
                }
            }
        };
        const returnOrderTransaction = {
            id: 'returnOrderTransactionId',
            typeOf: kwskfs.factory.transactionType.ReturnOrder,
            object: { transaction: placeOrderTransaction },
            potentialActions: {
                returnOrder: {
                    potentialActions: {
                        refund: refundActionAttributes
                    }
                }
            }
        };
        const action = { typeOf: refundActionAttributes.typeOf, id: 'actionId' };
        const searchTradeResult = { status: kwskfs.GMO.utils.util.Status.Void };

        const actionRepo = new kwskfs.repository.Action(kwskfs.mongoose.connection);
        const transactionRepo = new kwskfs.repository.Transaction(kwskfs.mongoose.connection);
        const taskRepo = new kwskfs.repository.Task(kwskfs.mongoose.connection);

        sandbox.mock(transactionRepo).expects('findReturnOrderById').once()
            .withExactArgs(returnOrderTransaction.id).resolves(returnOrderTransaction);
        sandbox.mock(actionRepo).expects('start').once()
            .withExactArgs(refundActionAttributes).resolves(action);
        sandbox.mock(actionRepo).expects('complete').once()
            .withArgs(action.typeOf, action.id).resolves(action);
        sandbox.mock(actionRepo).expects('giveUp').never();
        sandbox.mock(kwskfs.GMO.services.credit).expects('searchTrade').once().resolves(searchTradeResult);
        sandbox.mock(kwskfs.GMO.services.credit).expects('alterTran').never();
        sandbox.mock(taskRepo).expects('save').once();

        const result = await kwskfs.service.payment.refundCreditCard(returnOrderTransaction.id)({
            action: actionRepo,
            transaction: transactionRepo,
            task: taskRepo
        });

        assert.equal(result, undefined);
        sandbox.verify();
    });

    it('クレジットカード取引状態変更に失敗すればアクションにエラー結果が追加されるはず', async () => {
        const placeOrderTransaction = { ...existingTransaction };
        const refundActionAttributes = {
            typeOf: kwskfs.factory.actionType.RefundAction,
            potentialActions: {
                sendEmailMessage: {
                    typeOf: kwskfs.factory.actionType.SendAction
                }
            }
        };
        const returnOrderTransaction = {
            id: 'returnOrderTransactionId',
            typeOf: kwskfs.factory.transactionType.ReturnOrder,
            object: { transaction: placeOrderTransaction },
            potentialActions: {
                returnOrder: {
                    potentialActions: {
                        refund: refundActionAttributes
                    }
                }
            }
        };
        const action = { typeOf: refundActionAttributes.typeOf, id: 'actionId' };
        const searchTradeResult = { status: kwskfs.GMO.utils.util.Status.Sales };
        const alterTranResult = new Error('alterTranError');

        const actionRepo = new kwskfs.repository.Action(kwskfs.mongoose.connection);
        const transactionRepo = new kwskfs.repository.Transaction(kwskfs.mongoose.connection);
        const taskRepo = new kwskfs.repository.Task(kwskfs.mongoose.connection);

        sandbox.mock(transactionRepo).expects('findReturnOrderById').once()
            .withExactArgs(returnOrderTransaction.id).resolves(returnOrderTransaction);
        sandbox.mock(actionRepo).expects('start').once()
            .withExactArgs(refundActionAttributes).resolves(action);
        sandbox.mock(actionRepo).expects('complete').never();
        sandbox.mock(actionRepo).expects('giveUp').once()
            .withArgs(action.typeOf, action.id).resolves(action);
        sandbox.mock(kwskfs.GMO.services.credit).expects('searchTrade').once().resolves(searchTradeResult);
        sandbox.mock(kwskfs.GMO.services.credit).expects('alterTran').once().rejects(alterTranResult);
        sandbox.mock(taskRepo).expects('save').never();

        const result = await kwskfs.service.payment.refundCreditCard(returnOrderTransaction.id)({
            action: actionRepo,
            transaction: transactionRepo,
            task: taskRepo
        }).catch((err) => err);

        assert.deepEqual(result, alterTranResult);
        sandbox.verify();
    });
});
