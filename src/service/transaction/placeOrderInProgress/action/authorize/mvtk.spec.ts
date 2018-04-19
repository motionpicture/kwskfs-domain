// tslint:disable:no-implicit-dependencies
/**
 * placeOrderInProgress transaction service test
 * @ignore
 */

import * as assert from 'power-assert';
import * as sinon from 'sinon';
import * as kwskfs from '../../../../../index';
// tslint:disable-next-line:no-require-imports no-var-requires
require('sinon-mongoose');

let sandbox: sinon.SinonSandbox;

before(() => {
    sandbox = sinon.sandbox.create();
});

describe('action.authorize.mvtk.create()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('座席予約とムビチケ情報の整合性が合えば、エラーにならないはず', async () => {
        const agent = {
            id: 'agentId'
        };
        const seller = {
            id: 'sellerId',
            name: { ja: 'ja', en: 'ne' }
        };
        const transaction = {
            id: 'transactionId',
            agent: agent,
            seller: seller
        };
        const authorizeObject = {
            seatInfoSyncIn: {
                stCd: '1',
                skhnCd: '1234500',
                screnCd: '01',
                knyknrNoInfo: [
                    {
                        knyknrNo: '12345',
                        knshInfo: [{ miNum: 1 }]
                    }
                ],
                zskInfo: [{ zskCd: 'seatNum' }]
            }
        };
        const seatReservationAuthorizeActions = [{
            id: 'actionId',
            actionStatus: kwskfs.factory.actionStatusType.CompletedActionStatus,
            object: {
                offers: [
                    { ticketInfo: { mvtkNum: '12345' } },
                    { ticketInfo: { mvtkNum: '' } }
                ]
            },
            result: {
                acceptedOffers: [],
                updTmpReserveSeatArgs: {
                    theaterCode: '001',
                    titleCode: '12345',
                    titleBranchNum: '0',
                    screenCode: '01'
                },
                updTmpReserveSeatResult: {
                    listTmpReserve: [{ seatNum: 'seatNum' }]
                }
            }
        }];
        const action = {
            typeOf: kwskfs.factory.actionType.AuthorizeAction,
            id: 'actionId'
        };

        const actionRepo = new kwskfs.repository.Action(kwskfs.mongoose.connection);
        const transactionRepo = new kwskfs.repository.Transaction(kwskfs.mongoose.connection);

        sandbox.mock(transactionRepo).expects('findPlaceOrderInProgressById').once()
            .withExactArgs(transaction.id).resolves(transaction);
        sandbox.mock(actionRepo.actionModel)
            .expects('find').once()
            .chain('exec')
            .resolves(seatReservationAuthorizeActions.map((a) => new actionRepo.actionModel(a)));
        sandbox.mock(actionRepo).expects('start').once().resolves(action);
        sandbox.mock(actionRepo).expects('complete').once().withArgs(action.typeOf, action.id).resolves(action);

        const result = await kwskfs.service.transaction.placeOrderInProgress.action.authorize.mvtk.create(
            agent.id,
            transaction.id,
            <any>authorizeObject
        )({
            action: actionRepo,
            transaction: transactionRepo
        });

        assert.deepEqual(result, action);
        sandbox.verify();
    });

    it('座席予約承認が2つ存在すればArgumentエラーとなるはず', async () => {
        const agent = {
            id: 'agentId'
        };
        const seller = {
            id: 'sellerId',
            name: { ja: 'ja', en: 'ne' }
        };
        const transaction = {
            id: 'transactionId',
            agent: agent,
            seller: seller
        };
        const authorizeObject = {
            seatInfoSyncIn: {
                stCd: '1',
                skhnCd: '1234500',
                screnCd: '01',
                knyknrNoInfo: [
                    {
                        knyknrNo: '12345',
                        knshInfo: [{ miNum: 1 }]
                    }
                ],
                zskInfo: [{ zskCd: 'seatNum' }]
            }
        };
        const seatReservationAuthorizeActions = [
            {
                id: 'actionId',
                actionStatus: kwskfs.factory.actionStatusType.CompletedActionStatus,
                object: {},
                result: {}
            },
            {
                id: 'actionId',
                actionStatus: kwskfs.factory.actionStatusType.CompletedActionStatus,
                object: {},
                result: {}
            }
        ];

        const actionRepo = new kwskfs.repository.Action(kwskfs.mongoose.connection);
        const transactionRepo = new kwskfs.repository.Transaction(kwskfs.mongoose.connection);

        sandbox.mock(transactionRepo).expects('findPlaceOrderInProgressById').once()
            .withExactArgs(transaction.id).resolves(transaction);
        sandbox.mock(actionRepo.actionModel).expects('find').once().chain('exec')
            .resolves(seatReservationAuthorizeActions.map((a) => new actionRepo.actionModel(a)));
        sandbox.mock(actionRepo).expects('start').never();

        const result = await kwskfs.service.transaction.placeOrderInProgress.action.authorize.mvtk.create(
            agent.id,
            transaction.id,
            <any>authorizeObject
        )({
            action: actionRepo,
            transaction: transactionRepo
        }).catch((err) => err);

        assert(result instanceof kwskfs.factory.errors.Argument);
        sandbox.verify();
    });

    it('所有者の取引でなければ、Forbiddenエラーが投げられるはず', async () => {
        const agent = {
            id: 'agentId'
        };
        const seller = {
            id: 'sellerId',
            name: { ja: 'ja', en: 'ne' }
        };
        const transaction = {
            id: 'transactionId',
            agent: { id: 'anotherAgentId' },
            seller: seller
        };
        const authorizeObject = {};

        const actionRepo = new kwskfs.repository.Action(kwskfs.mongoose.connection);
        const transactionRepo = new kwskfs.repository.Transaction(kwskfs.mongoose.connection);

        sandbox.mock(transactionRepo).expects('findPlaceOrderInProgressById').once()
            .withExactArgs(transaction.id).resolves(transaction);
        sandbox.mock(actionRepo).expects('start').never();
        sandbox.mock(actionRepo).expects('complete').never();

        const result = await kwskfs.service.transaction.placeOrderInProgress.action.authorize.mvtk.create(
            agent.id,
            transaction.id,
            <any>authorizeObject
        )({
            action: actionRepo,
            transaction: transactionRepo
        }).catch((err) => err);

        assert(result instanceof kwskfs.factory.errors.Forbidden);
        sandbox.verify();
    });

    it('座席予約承認アクションが存在していなければArgumentエラーとなるはず', async () => {
        const agent = {
            id: 'agentId'
        };
        const seller = {
            id: 'sellerId',
            name: { ja: 'ja', en: 'ne' }
        };
        const transaction = {
            id: 'transactionId',
            agent: agent,
            seller: seller
        };
        const authorizeObject = {
            seatInfoSyncIn: {
                stCd: '1',
                skhnCd: '1234500',
                screnCd: '01',
                knyknrNoInfo: [
                    {
                        knyknrNo: '12345',
                        knshInfo: [
                            {
                                miNum: 1
                            }
                        ]
                    }
                ],
                zskInfo: []
            }
        };
        const seatReservationAuthorizeActions: any[] = [];

        const actionRepo = new kwskfs.repository.Action(kwskfs.mongoose.connection);
        const transactionRepo = new kwskfs.repository.Transaction(kwskfs.mongoose.connection);

        sandbox.mock(transactionRepo).expects('findPlaceOrderInProgressById').once()
            .withExactArgs(transaction.id).resolves(transaction);
        sandbox.mock(actionRepo.actionModel).expects('find').once()
            .chain('exec').resolves(seatReservationAuthorizeActions.map((a) => new actionRepo.actionModel(a)));
        sandbox.mock(actionRepo).expects('start').never();

        const result = await kwskfs.service.transaction.placeOrderInProgress.action.authorize.mvtk.create(
            agent.id,
            transaction.id,
            <any>authorizeObject
        )({
            action: actionRepo,
            transaction: transactionRepo
        }).catch((err) => err);

        assert(result instanceof kwskfs.factory.errors.Argument);
        sandbox.verify();
    });

    it('座席予約承認アクションと購入管理番号が一致していなければArgumentエラーとなるはず', async () => {
        const agent = {
            id: 'agentId'
        };
        const seller = {
            id: 'sellerId',
            name: { ja: 'ja', en: 'ne' }
        };
        const transaction = {
            id: 'transactionId',
            agent: agent,
            seller: seller
        };
        const authorizeObject = {
            seatInfoSyncIn: {
                stCd: '1',
                skhnCd: '1234500',
                screnCd: '01',
                knyknrNoInfo: [
                    {
                        knyknrNo: '12345',
                        knshInfo: [{ miNum: 1 }]
                    }
                ],
                zskInfo: []
            }
        };
        const seatReservationAuthorizeActions = [{
            id: 'actionId',
            actionStatus: kwskfs.factory.actionStatusType.CompletedActionStatus,
            object: {
                offers: [
                    { ticketInfo: { mvtkNum: '123456' } },
                    { ticketInfo: { mvtkNum: '' } }
                ]
            },
            result: {
                acceptedOffers: [],
                updTmpReserveSeatArgs: {
                    theaterCode: '001',
                    titleCode: '12345',
                    titleBranchNum: '0',
                    screenCode: '01'
                },
                updTmpReserveSeatResult: {
                    listTmpReserve: []
                }
            }
        }];

        const actionRepo = new kwskfs.repository.Action(kwskfs.mongoose.connection);
        const transactionRepo = new kwskfs.repository.Transaction(kwskfs.mongoose.connection);

        sandbox.mock(transactionRepo).expects('findPlaceOrderInProgressById').once()
            .withExactArgs(transaction.id).resolves(transaction);
        sandbox.mock(actionRepo.actionModel).expects('find').once()
            .chain('exec').resolves(seatReservationAuthorizeActions.map((a) => new actionRepo.actionModel(a)));
        sandbox.mock(actionRepo).expects('start').never();

        const result = await kwskfs.service.transaction.placeOrderInProgress.action.authorize.mvtk.create(
            agent.id,
            transaction.id,
            <any>authorizeObject
        )({
            action: actionRepo,
            transaction: transactionRepo
        }).catch((err) => err);

        assert(result instanceof kwskfs.factory.errors.Argument);
        sandbox.verify();
    });

    it('座席予約承認アクションとサイトコードが一致していなければArgumentエラーとなるはず', async () => {
        const agent = {
            id: 'agentId'
        };
        const seller = {
            id: 'sellerId',
            name: { ja: 'ja', en: 'ne' }
        };
        const transaction = {
            id: 'transactionId',
            agent: agent,
            seller: seller
        };
        const authorizeObject = {
            seatInfoSyncIn: {
                stCd: 'invalid',
                skhnCd: '1234500',
                screnCd: '01',
                knyknrNoInfo: [
                    {
                        knyknrNo: '12345',
                        knshInfo: [{ miNum: 1 }]
                    }
                ],
                zskInfo: []
            }
        };
        const seatReservationAuthorizeActions = [{
            id: 'actionId',
            actionStatus: kwskfs.factory.actionStatusType.CompletedActionStatus,
            object: {
                offers: [
                    { ticketInfo: { mvtkNum: '12345' } },
                    { ticketInfo: { mvtkNum: '' } }
                ]
            },
            result: {
                acceptedOffers: [],
                updTmpReserveSeatArgs: {
                    theaterCode: '001',
                    titleCode: '12345',
                    titleBranchNum: '0',
                    screenCode: '01'
                },
                updTmpReserveSeatResult: {
                    listTmpReserve: []
                }
            }
        }];

        const actionRepo = new kwskfs.repository.Action(kwskfs.mongoose.connection);
        const transactionRepo = new kwskfs.repository.Transaction(kwskfs.mongoose.connection);

        sandbox.mock(transactionRepo).expects('findPlaceOrderInProgressById').once()
            .withExactArgs(transaction.id).resolves(transaction);
        sandbox.mock(actionRepo.actionModel).expects('find').once()
            .chain('exec').resolves(seatReservationAuthorizeActions.map((a) => new actionRepo.actionModel(a)));
        sandbox.mock(actionRepo).expects('start').never();

        const result = await kwskfs.service.transaction.placeOrderInProgress.action.authorize.mvtk.create(
            agent.id,
            transaction.id,
            <any>authorizeObject
        )({
            action: actionRepo,
            transaction: transactionRepo
        }).catch((err) => err);

        assert(result instanceof kwskfs.factory.errors.Argument);
        sandbox.verify();
    });

    it('座席予約承認アクションと作品コードが一致していなければArgumentエラーとなるはず', async () => {
        const agent = {
            id: 'agentId'
        };
        const seller = {
            id: 'sellerId',
            name: { ja: 'ja', en: 'ne' }
        };
        const transaction = {
            id: 'transactionId',
            agent: agent,
            seller: seller
        };
        const authorizeObject = {
            seatInfoSyncIn: {
                stCd: '1',
                skhnCd: '1234500',
                screnCd: '01',
                knyknrNoInfo: [
                    {
                        knyknrNo: '12345',
                        knshInfo: [{ miNum: 1 }]
                    }
                ],
                zskInfo: []
            }
        };
        const seatReservationAuthorizeActions = [{
            id: 'actionId',
            actionStatus: kwskfs.factory.actionStatusType.CompletedActionStatus,
            object: {
                offers: [
                    { ticketInfo: { mvtkNum: '12345' } },
                    { ticketInfo: { mvtkNum: '' } }
                ]
            },
            result: {
                acceptedOffers: [],
                updTmpReserveSeatArgs: {
                    theaterCode: '001',
                    titleCode: '12345',
                    titleBranchNum: '1', // invalid
                    screenCode: '01'
                },
                updTmpReserveSeatResult: {
                    listTmpReserve: []
                }
            }
        }];

        const actionRepo = new kwskfs.repository.Action(kwskfs.mongoose.connection);
        const transactionRepo = new kwskfs.repository.Transaction(kwskfs.mongoose.connection);

        sandbox.mock(transactionRepo).expects('findPlaceOrderInProgressById').once()
            .withExactArgs(transaction.id).resolves(transaction);
        sandbox.mock(actionRepo.actionModel).expects('find').once()
            .chain('exec').resolves(seatReservationAuthorizeActions.map((a) => new actionRepo.actionModel(a)));
        sandbox.mock(actionRepo).expects('start').never();

        const result = await kwskfs.service.transaction.placeOrderInProgress.action.authorize.mvtk.create(
            agent.id,
            transaction.id,
            <any>authorizeObject
        )({
            action: actionRepo,
            transaction: transactionRepo
        }).catch((err) => err);

        assert(result instanceof kwskfs.factory.errors.Argument);
        sandbox.verify();
    });

    it('座席予約承認アクションとスクリーンコードが一致していなければArgumentエラーとなるはず', async () => {
        const agent = {
            id: 'agentId'
        };
        const seller = {
            id: 'sellerId',
            name: { ja: 'ja', en: 'ne' }
        };
        const transaction = {
            id: 'transactionId',
            agent: agent,
            seller: seller
        };
        const authorizeObject = {
            seatInfoSyncIn: {
                stCd: '1',
                skhnCd: '1234500',
                screnCd: '01',
                knyknrNoInfo: [
                    {
                        knyknrNo: '12345',
                        knshInfo: [{ miNum: 1 }]
                    }
                ],
                zskInfo: []
            }
        };
        const seatReservationAuthorizeActions = [{
            id: 'actionId',
            actionStatus: kwskfs.factory.actionStatusType.CompletedActionStatus,
            object: {
                offers: [
                    { ticketInfo: { mvtkNum: '12345' } },
                    { ticketInfo: { mvtkNum: '' } }
                ]
            },
            result: {
                acceptedOffers: [],
                updTmpReserveSeatArgs: {
                    theaterCode: '001',
                    titleCode: '12345',
                    titleBranchNum: '0',
                    screenCode: '02' // invalid
                },
                updTmpReserveSeatResult: {
                    listTmpReserve: []
                }
            }
        }];

        const actionRepo = new kwskfs.repository.Action(kwskfs.mongoose.connection);
        const transactionRepo = new kwskfs.repository.Transaction(kwskfs.mongoose.connection);

        sandbox.mock(transactionRepo).expects('findPlaceOrderInProgressById').once()
            .withExactArgs(transaction.id).resolves(transaction);
        sandbox.mock(actionRepo.actionModel).expects('find').once()
            .chain('exec').resolves(seatReservationAuthorizeActions.map((a) => new actionRepo.actionModel(a)));
        sandbox.mock(actionRepo).expects('start').never();

        const result = await kwskfs.service.transaction.placeOrderInProgress.action.authorize.mvtk.create(
            agent.id,
            transaction.id,
            <any>authorizeObject
        )({
            action: actionRepo,
            transaction: transactionRepo
        }).catch((err) => err);

        assert(result instanceof kwskfs.factory.errors.Argument);
        sandbox.verify();
    });

    it('座席予約承認アクションと座席番号が一致していなければArgumentエラーとなるはず', async () => {
        const agent = {
            id: 'agentId'
        };
        const seller = {
            id: 'sellerId',
            name: { ja: 'ja', en: 'ne' }
        };
        const transaction = {
            id: 'transactionId',
            agent: agent,
            seller: seller
        };
        const authorizeObject = {
            seatInfoSyncIn: {
                stCd: '1',
                skhnCd: '1234500',
                screnCd: '01',
                knyknrNoInfo: [
                    {
                        knyknrNo: '12345',
                        knshInfo: [{ miNum: 1 }]
                    }
                ],
                zskInfo: [{ zskCd: 'seatNum' }]
            }
        };
        const seatReservationAuthorizeActions = [{
            id: 'actionId',
            actionStatus: kwskfs.factory.actionStatusType.CompletedActionStatus,
            object: {
                offers: [
                    { ticketInfo: { mvtkNum: '12345' } },
                    { ticketInfo: { mvtkNum: '' } }
                ]
            },
            result: {
                acceptedOffers: [],
                updTmpReserveSeatArgs: {
                    theaterCode: '001',
                    titleCode: '12345',
                    titleBranchNum: '0',
                    screenCode: '01'
                },
                updTmpReserveSeatResult: {
                    listTmpReserve: [{ seatNum: 'invalid' }] // invalid
                }
            }
        }];

        const actionRepo = new kwskfs.repository.Action(kwskfs.mongoose.connection);
        const transactionRepo = new kwskfs.repository.Transaction(kwskfs.mongoose.connection);

        sandbox.mock(transactionRepo).expects('findPlaceOrderInProgressById').once()
            .withExactArgs(transaction.id).resolves(transaction);
        sandbox.mock(actionRepo.actionModel).expects('find').once()
            .chain('exec').resolves(seatReservationAuthorizeActions.map((a) => new actionRepo.actionModel(a)));
        sandbox.mock(actionRepo).expects('start').never();

        const result = await kwskfs.service.transaction.placeOrderInProgress.action.authorize.mvtk.create(
            agent.id,
            transaction.id,
            <any>authorizeObject
        )({
            action: actionRepo,
            transaction: transactionRepo
        }).catch((err) => err);

        assert(result instanceof kwskfs.factory.errors.Argument);
        sandbox.verify();
    });
});

describe('action.authorize.mvtk.cancel()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('アクションが存在すれば、キャンセルできるはず', async () => {
        const agent = {
            id: 'agentId'
        };
        const seller = {
            id: 'sellerId',
            name: { ja: 'ja', en: 'ne' }
        };
        const action = {
            typeOf: kwskfs.factory.actionType.AuthorizeAction,
            id: 'actionId'
        };
        const transaction = {
            id: 'transactionId',
            agent: agent,
            seller: seller
        };

        const authorizeActionRepo = new kwskfs.repository.Action(kwskfs.mongoose.connection);
        const transactionRepo = new kwskfs.repository.Transaction(kwskfs.mongoose.connection);

        sandbox.mock(transactionRepo).expects('findPlaceOrderInProgressById').once()
            .withExactArgs(transaction.id).resolves(transaction);
        sandbox.mock(authorizeActionRepo).expects('cancel').once().withExactArgs(action.typeOf, action.id).resolves();

        const result = await kwskfs.service.transaction.placeOrderInProgress.action.authorize.mvtk.cancel(
            agent.id,
            transaction.id,
            action.id
        )({
            action: authorizeActionRepo,
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
            name: { ja: 'ja', en: 'ne' }
        };
        const action = {
            id: 'actionId'
        };
        const transaction = {
            id: 'transactionId',
            agent: { id: 'anotherAgentId' },
            seller: seller
        };

        const authorizeActionRepo = new kwskfs.repository.Action(kwskfs.mongoose.connection);
        const transactionRepo = new kwskfs.repository.Transaction(kwskfs.mongoose.connection);

        sandbox.mock(transactionRepo).expects('findPlaceOrderInProgressById').once()
            .withExactArgs(transaction.id).resolves(transaction);
        sandbox.mock(authorizeActionRepo).expects('cancel').never();

        const result = await kwskfs.service.transaction.placeOrderInProgress.action.authorize.mvtk.cancel(
            agent.id,
            transaction.id,
            action.id
        )({
            action: authorizeActionRepo,
            transaction: transactionRepo
        }).catch((err) => err);

        assert(result instanceof kwskfs.factory.errors.Forbidden);
        sandbox.verify();
    });
});
