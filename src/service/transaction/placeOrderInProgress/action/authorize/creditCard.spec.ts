// tslint:disable:no-implicit-dependencies

/**
 * placeOrderInProgress transaction service test
 * @ignore
 */

import * as assert from 'power-assert';
import * as sinon from 'sinon';
import * as kwskfs from '../../../../../index';

let sandbox: sinon.SinonSandbox;

before(() => {
    sandbox = sinon.sandbox.create();
});

describe('action.authorize.creditCard.create()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('GMOが正常であれば、エラーにならないはず', async () => {
        const agent = {
            id: 'agentId'
        };
        const seller = {
            id: 'sellerId',
            name: { ja: 'ja', en: 'ne' },
            gmoInfo: {
                shopId: 'shopId',
                shopPass: 'shopPass'
            }
        };
        const transaction = {
            id: 'transactionId',
            agent: agent,
            seller: seller
        };
        const orderId = 'orderId';
        const amount = 1234;
        const creditCard = <any>{};
        const entryTranResult = {};
        const execTranResult = {};
        const action = {
            id: 'actionId',
            agent: agent,
            recipient: seller
        };

        const actionRepo = new kwskfs.repository.Action(kwskfs.mongoose.connection);
        const organizationRepo = new kwskfs.repository.Organization(kwskfs.mongoose.connection);
        const transactionRepo = new kwskfs.repository.Transaction(kwskfs.mongoose.connection);

        sandbox.mock(transactionRepo).expects('findPlaceOrderInProgressById').once()
            .withExactArgs(transaction.id).resolves(transaction);
        sandbox.mock(actionRepo).expects('start').once().resolves(action);
        sandbox.mock(organizationRepo).expects('findById').once().withExactArgs(seller.id).resolves(seller);
        sandbox.mock(kwskfs.GMO.services.credit).expects('entryTran').once().resolves(entryTranResult);
        sandbox.mock(kwskfs.GMO.services.credit).expects('execTran').once().resolves(execTranResult);
        sandbox.mock(actionRepo).expects('complete').once().resolves(action);

        const result = await kwskfs.service.transaction.placeOrderInProgress.action.authorize.creditCard.create(
            agent.id,
            transaction.id,
            orderId,
            amount,
            kwskfs.GMO.utils.util.Method.Lump,
            creditCard
        )({
            action: actionRepo,
            transaction: transactionRepo,
            organization: organizationRepo
        });

        assert.deepEqual(result, action);
        sandbox.verify();
    });

    // it('所有者の取引でなければ、Forbiddenエラーが投げられるはず', async () => {
    //     const agent = {
    //         id: 'agentId'
    //     };
    //     const seller = {
    //         id: 'sellerId',
    //         name: { ja: 'ja', en: 'ne' },
    //         gmoInfo: {
    //             shopId: 'shopId',
    //             shopPass: 'shopPass'
    //         }
    //     };
    //     const transaction = {
    //         id: 'transactionId',
    //         agent: {
    //             id: 'anotherAgentId'
    //         },
    //         seller: seller
    //     };
    //     const orderId = 'orderId';
    //     const amount = 1234;
    //     const creditCard = <any>{};

    //     const actionRepo = new kwskfs.repository.Action(kwskfs.mongoose.connection);
    //     const organizationRepo = new kwskfs.repository.Organization(kwskfs.mongoose.connection);
    //     const transactionRepo = new kwskfs.repository.Transaction(kwskfs.mongoose.connection);

    //     sandbox.mock(transactionRepo).expects('findPlaceOrderInProgressById').once()
    //         .withExactArgs(transaction.id).resolves(transaction);
    //     sandbox.mock(actionRepo).expects('start').never();
    //     sandbox.mock(organizationRepo).expects('findById').never();
    //     sandbox.mock(kwskfs.GMO.services.credit).expects('entryTran').never();
    //     sandbox.mock(kwskfs.GMO.services.credit).expects('execTran').never();

    //     const result = await kwskfs.service.transaction.placeOrderInProgress.action.authorize.creditCard.create(
    //         agent.id,
    //         transaction.id,
    //         orderId,
    //         amount,
    //         kwskfs.GMO.utils.util.Method.Lump,
    //         creditCard
    //     )({
    //         action: actionRepo,
    //         transaction: transactionRepo,
    //         organization: organizationRepo
    //     })
    //         .catch((err) => err);

    //     assert(result instanceof kwskfs.factory.errors.Forbidden);
    //     sandbox.verify();
    // });

    it('GMOでエラーが発生すれば、承認アクションを諦めて、エラーとなるはず', async () => {
        const agent = {
            id: 'agentId'
        };
        const seller = {
            id: 'sellerId',
            name: { ja: 'ja', en: 'ne' },
            gmoInfo: {
                shopId: 'shopId',
                shopPass: 'shopPass'
            }
        };
        const transaction = {
            id: 'transactionId',
            agent: agent,
            seller: seller
        };
        const orderId = 'orderId';
        const amount = 1234;
        const creditCard = <any>{};
        const action = {
            typeOf: kwskfs.factory.actionType.AuthorizeAction,
            id: 'actionId',
            agent: agent,
            recipient: seller
        };
        const entryTranResult = new Error('entryTranResultError');

        const actionRepo = new kwskfs.repository.Action(kwskfs.mongoose.connection);
        const organizationRepo = new kwskfs.repository.Organization(kwskfs.mongoose.connection);
        const transactionRepo = new kwskfs.repository.Transaction(kwskfs.mongoose.connection);

        sandbox.mock(transactionRepo).expects('findPlaceOrderInProgressById').once()
            .withExactArgs(transaction.id).resolves(transaction);
        sandbox.mock(actionRepo).expects('start').once().resolves(action);
        sandbox.mock(organizationRepo).expects('findById').once().withExactArgs(seller.id).resolves(seller);
        sandbox.mock(kwskfs.GMO.services.credit).expects('entryTran').once().rejects(entryTranResult);
        sandbox.mock(kwskfs.GMO.services.credit).expects('execTran').never();
        sandbox.mock(actionRepo).expects('giveUp').once()
            .withArgs(action.typeOf, action.id, sinon.match({ message: entryTranResult.message })).resolves(action);
        sandbox.mock(actionRepo).expects('complete').never();

        const result = await kwskfs.service.transaction.placeOrderInProgress.action.authorize.creditCard.create(
            agent.id,
            transaction.id,
            orderId,
            amount,
            kwskfs.GMO.utils.util.Method.Lump,
            creditCard
        )({
            action: actionRepo,
            transaction: transactionRepo,
            organization: organizationRepo
        }).catch((err) => err);

        assert(result instanceof Error);
        sandbox.verify();
    });

    it('GMO処理でエラーオブジェクトでない例外が発生すれば、承認アクションを諦めて、エラーとなるはず', async () => {
        const agent = {
            id: 'agentId'
        };
        const seller = {
            id: 'sellerId',
            name: { ja: 'ja', en: 'ne' },
            gmoInfo: {
                shopId: 'shopId',
                shopPass: 'shopPass'
            }
        };
        const transaction = {
            id: 'transactionId',
            agent: agent,
            seller: seller
        };
        const orderId = 'orderId';
        const amount = 1234;
        const creditCard = <any>{};
        const action = {
            typeOf: kwskfs.factory.actionType.AuthorizeAction,
            id: 'actionId',
            agent: agent,
            recipient: seller
        };
        const entryTranResult = 123;

        const actionRepo = new kwskfs.repository.Action(kwskfs.mongoose.connection);
        const organizationRepo = new kwskfs.repository.Organization(kwskfs.mongoose.connection);
        const transactionRepo = new kwskfs.repository.Transaction(kwskfs.mongoose.connection);

        sandbox.mock(transactionRepo).expects('findPlaceOrderInProgressById').once()
            .withExactArgs(transaction.id).resolves(transaction);
        sandbox.mock(actionRepo).expects('start').once().resolves(action);
        sandbox.mock(organizationRepo).expects('findById').once().withExactArgs(seller.id).resolves(seller);
        sandbox.mock(kwskfs.GMO.services.credit).expects('entryTran').once().rejects(entryTranResult);
        sandbox.mock(kwskfs.GMO.services.credit).expects('execTran').never();
        sandbox.mock(actionRepo).expects('giveUp').once()
            .withArgs(action.typeOf, action.id, entryTranResult).resolves(action);
        sandbox.mock(actionRepo).expects('complete').never();

        const result = await kwskfs.service.transaction.placeOrderInProgress.action.authorize.creditCard.create(
            agent.id,
            transaction.id,
            orderId,
            amount,
            kwskfs.GMO.utils.util.Method.Lump,
            creditCard
        )({
            action: actionRepo,
            transaction: transactionRepo,
            organization: organizationRepo
        }).catch((err) => err);

        assert(result instanceof Error);
        sandbox.verify();
    });

    it('GMOで流量制限オーバーエラーが発生すれば、承認アクションを諦めて、ServiceUnavailableエラーとなるはず', async () => {
        const agent = {
            id: 'agentId'
        };
        const seller = {
            id: 'sellerId',
            name: { ja: 'ja', en: 'ne' },
            gmoInfo: {
                shopId: 'shopId',
                shopPass: 'shopPass'
            }
        };
        const transaction = {
            id: 'transactionId',
            agent: agent,
            seller: seller
        };
        const orderId = 'orderId';
        const amount = 1234;
        const creditCard = <any>{};
        const action = {
            typeOf: kwskfs.factory.actionType.AuthorizeAction,
            id: 'actionId',
            agent: agent,
            recipient: seller
        };
        const entryTranResult = new Error('message');
        entryTranResult.name = 'GMOServiceBadRequestError';
        (<any>entryTranResult).errors = [{
            info: 'E92000001'
        }];

        const actionRepo = new kwskfs.repository.Action(kwskfs.mongoose.connection);
        const organizationRepo = new kwskfs.repository.Organization(kwskfs.mongoose.connection);
        const transactionRepo = new kwskfs.repository.Transaction(kwskfs.mongoose.connection);

        sandbox.mock(transactionRepo).expects('findPlaceOrderInProgressById').once()
            .withExactArgs(transaction.id).resolves(transaction);
        sandbox.mock(actionRepo).expects('start').once().resolves(action);
        sandbox.mock(organizationRepo).expects('findById').once().withExactArgs(seller.id).resolves(seller);
        sandbox.mock(kwskfs.GMO.services.credit).expects('entryTran').once().rejects(entryTranResult);
        sandbox.mock(kwskfs.GMO.services.credit).expects('execTran').never();
        sandbox.mock(actionRepo).expects('giveUp').once()
            .withArgs(action.typeOf, action.id, sinon.match({ message: entryTranResult.message })).resolves(action);
        sandbox.mock(actionRepo).expects('complete').never();

        const result = await kwskfs.service.transaction.placeOrderInProgress.action.authorize.creditCard.create(
            agent.id,
            transaction.id,
            orderId,
            amount,
            kwskfs.GMO.utils.util.Method.Lump,
            creditCard
        )({
            action: actionRepo,
            transaction: transactionRepo,
            organization: organizationRepo
        }).catch((err) => err);

        assert(result instanceof kwskfs.factory.errors.RateLimitExceeded);
        sandbox.verify();
    });

    it('GMOでオーダーID重複エラーが発生すれば、承認アクションを諦めて、AlreadyInUseエラーとなるはず', async () => {
        const agent = {
            id: 'agentId'
        };
        const seller = {
            id: 'sellerId',
            name: { ja: 'ja', en: 'ne' },
            gmoInfo: {
                shopId: 'shopId',
                shopPass: 'shopPass'
            }
        };
        const transaction = {
            id: 'transactionId',
            agent: agent,
            seller: seller
        };
        const orderId = 'orderId';
        const amount = 1234;
        const creditCard = <any>{};
        const action = {
            typeOf: kwskfs.factory.actionType.AuthorizeAction,
            id: 'actionId',
            agent: agent,
            recipient: seller
        };
        const entryTranResult = new Error('message');
        entryTranResult.name = 'GMOServiceBadRequestError';
        (<any>entryTranResult).errors = [{
            info: 'E01040010'
        }];

        const actionRepo = new kwskfs.repository.Action(kwskfs.mongoose.connection);
        const organizationRepo = new kwskfs.repository.Organization(kwskfs.mongoose.connection);
        const transactionRepo = new kwskfs.repository.Transaction(kwskfs.mongoose.connection);

        sandbox.mock(transactionRepo).expects('findPlaceOrderInProgressById').once()
            .withExactArgs(transaction.id).resolves(transaction);
        sandbox.mock(actionRepo).expects('start').once().resolves(action);
        sandbox.mock(organizationRepo).expects('findById').once().withExactArgs(seller.id).resolves(seller);
        sandbox.mock(kwskfs.GMO.services.credit).expects('entryTran').once().rejects(entryTranResult);
        sandbox.mock(kwskfs.GMO.services.credit).expects('execTran').never();
        sandbox.mock(actionRepo).expects('giveUp').once()
            .withArgs(action.typeOf, action.id, sinon.match({ message: entryTranResult.message })).resolves(action);
        sandbox.mock(actionRepo).expects('complete').never();

        const result = await kwskfs.service.transaction.placeOrderInProgress.action.authorize.creditCard.create(
            agent.id,
            transaction.id,
            orderId,
            amount,
            kwskfs.GMO.utils.util.Method.Lump,
            creditCard
        )({
            action: actionRepo,
            transaction: transactionRepo,
            organization: organizationRepo
        }).catch((err) => err);

        assert(result instanceof kwskfs.factory.errors.AlreadyInUse);
        sandbox.verify();
    });

    it('GMOServiceBadRequestErrorエラーが発生すれば、承認アクションを諦めて、Argumentエラーとなるはず', async () => {
        const agent = {
            id: 'agentId'
        };
        const seller = {
            id: 'sellerId',
            name: { ja: 'ja', en: 'ne' },
            gmoInfo: {
                shopId: 'shopId',
                shopPass: 'shopPass'
            }
        };
        const transaction = {
            id: 'transactionId',
            agent: agent,
            seller: seller
        };
        const orderId = 'orderId';
        const amount = 1234;
        const creditCard = <any>{};
        const action = {
            typeOf: kwskfs.factory.actionType.AuthorizeAction,
            id: 'actionId',
            agent: agent,
            recipient: seller
        };
        const entryTranResult = new Error('message');
        entryTranResult.name = 'GMOServiceBadRequestError';
        (<any>entryTranResult).errors = [{
            info: 'info'
        }];

        const actionRepo = new kwskfs.repository.Action(kwskfs.mongoose.connection);
        const organizationRepo = new kwskfs.repository.Organization(kwskfs.mongoose.connection);
        const transactionRepo = new kwskfs.repository.Transaction(kwskfs.mongoose.connection);

        sandbox.mock(transactionRepo).expects('findPlaceOrderInProgressById').once()
            .withExactArgs(transaction.id).resolves(transaction);
        sandbox.mock(actionRepo).expects('start').once().resolves(action);
        sandbox.mock(organizationRepo).expects('findById').once().withExactArgs(seller.id).resolves(seller);
        sandbox.mock(kwskfs.GMO.services.credit).expects('entryTran').once().rejects(entryTranResult);
        sandbox.mock(kwskfs.GMO.services.credit).expects('execTran').never();
        sandbox.mock(actionRepo).expects('giveUp').once()
            .withArgs(action.typeOf, action.id, sinon.match({ message: entryTranResult.message })).resolves(action);
        sandbox.mock(actionRepo).expects('complete').never();

        const result = await kwskfs.service.transaction.placeOrderInProgress.action.authorize.creditCard.create(
            agent.id,
            transaction.id,
            orderId,
            amount,
            kwskfs.GMO.utils.util.Method.Lump,
            creditCard
        )({
            action: actionRepo,
            transaction: transactionRepo,
            organization: organizationRepo
        }).catch((err) => err);

        assert(result instanceof kwskfs.factory.errors.Argument);
        sandbox.verify();
    });
});

describe('action.authorize.creditCard.cancel()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('アクションが存在すれば、キャンセルできるはず', async () => {
        const agent = {
            id: 'agentId'
        };
        const seller = {
            id: 'sellerId',
            name: { ja: 'ja', en: 'ne' },
            gmoInfo: {
                shopId: 'shopId',
                shopPass: 'shopPass'
            }
        };
        const action = {
            typeOf: kwskfs.factory.actionType.AuthorizeAction,
            id: 'actionId',
            result: {
                execTranArgs: {},
                entryTranArgs: {}
            }
        };
        const transaction = {
            id: 'transactionId',
            agent: agent,
            seller: seller
        };

        const actionRepo = new kwskfs.repository.Action(kwskfs.mongoose.connection);
        const transactionRepo = new kwskfs.repository.Transaction(kwskfs.mongoose.connection);

        sandbox.mock(transactionRepo).expects('findPlaceOrderInProgressById').once()
            .withExactArgs(transaction.id).resolves(transaction);
        sandbox.mock(actionRepo).expects('cancel').once()
            .withExactArgs(action.typeOf, action.id).resolves(action);
        sandbox.mock(kwskfs.GMO.services.credit).expects('alterTran').once().resolves();

        const result = await kwskfs.service.transaction.placeOrderInProgress.action.authorize.creditCard.cancel(
            agent.id,
            transaction.id,
            action.id
        )({
            action: actionRepo,
            transaction: transactionRepo
        });

        assert.equal(result, undefined);
        sandbox.verify();
    });

    it('所有者の取引でなければ、Forbiddenエラーが投げられるはず', async () => {
        const agent = {
            id: 'agentId'
        };
        const seller = {
            id: 'sellerId',
            name: { ja: 'ja', en: 'ne' },
            gmoInfo: {
                shopId: 'shopId',
                shopPass: 'shopPass'
            }
        };
        const actionId = 'actionId';
        const transaction = {
            id: 'transactionId',
            agent: {
                id: 'anotherAgentId'
            },
            seller: seller
        };

        const actionRepo = new kwskfs.repository.Action(kwskfs.mongoose.connection);
        const transactionRepo = new kwskfs.repository.Transaction(kwskfs.mongoose.connection);

        sandbox.mock(transactionRepo).expects('findPlaceOrderInProgressById').once()
            .withExactArgs(transaction.id).resolves(transaction);
        sandbox.mock(actionRepo).expects('cancel').never();
        sandbox.mock(kwskfs.GMO.services.credit).expects('alterTran').never();

        const result = await kwskfs.service.transaction.placeOrderInProgress.action.authorize.creditCard.cancel(
            agent.id,
            transaction.id,
            actionId
        )({
            action: actionRepo,
            transaction: transactionRepo
        }).catch((err) => err);

        assert(result instanceof kwskfs.factory.errors.Forbidden);
        sandbox.verify();
    });

    it('GMOで取消に失敗しても、エラーにならないはず', async () => {
        const agent = {
            id: 'agentId'
        };
        const seller = {
            id: 'sellerId',
            name: { ja: 'ja', en: 'ne' },
            gmoInfo: {
                shopId: 'shopId',
                shopPass: 'shopPass'
            }
        };
        const action = {
            typeOf: kwskfs.factory.actionType.AuthorizeAction,
            id: 'actionId',
            result: {
                execTranArgs: {},
                entryTranArgs: {}
            }
        };
        const transaction = {
            id: 'transactionId',
            agent: agent,
            seller: seller
        };

        const actionRepo = new kwskfs.repository.Action(kwskfs.mongoose.connection);
        const transactionRepo = new kwskfs.repository.Transaction(kwskfs.mongoose.connection);

        sandbox.mock(transactionRepo).expects('findPlaceOrderInProgressById').once()
            .withExactArgs(transaction.id).resolves(transaction);
        sandbox.mock(actionRepo).expects('cancel').once()
            .withExactArgs(action.typeOf, action.id).resolves(action);
        sandbox.mock(kwskfs.GMO.services.credit).expects('alterTran').once().rejects();

        const result = await kwskfs.service.transaction.placeOrderInProgress.action.authorize.creditCard.cancel(
            agent.id,
            transaction.id,
            action.id
        )({
            action: actionRepo,
            transaction: transactionRepo
        });

        assert.equal(result, undefined);
        sandbox.verify();
    });
});
