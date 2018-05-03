// tslint:disable:no-implicit-dependencies
/**
 * placeOrder transaction service test
 * @ignore
 */

import * as assert from 'power-assert';
import * as sinon from 'sinon';
// tslint:disable-next-line:no-require-imports no-var-requires
require('sinon-mongoose');
import * as kwskfs from '../../index';

let sandbox: sinon.SinonSandbox;

before(() => {
    sandbox = sinon.sandbox.create();
});

describe('exportTasks()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    // it('非対応ステータスであれば、Argumentエラーになるはず', async () => {
    //     const transactionRepo = new kwskfs.repository.Transaction(kwskfs.mongoose.connection);
    //     const taskRepo = new kwskfs.repository.Task(kwskfs.mongoose.connection);

    //     const status = kwskfs.factory.transactionStatusType.InProgress;

    //     sandbox.mock(transactionRepo).expects('startExportTasks').never();
    //     sandbox.mock(transactionRepo).expects('findById').never();
    //     sandbox.mock(taskRepo).expects('save').never();
    //     sandbox.mock(transactionRepo).expects('setTasksExportedById').never();

    //     const result = await kwskfs.service.transaction.placeOrder.exportTasks(
    //         status
    //     )({
    //         task: taskRepo,
    //         transaction: transactionRepo
    //     }).catch((err) => err);
    //     assert(result instanceof kwskfs.factory.errors.Argument);
    //     sandbox.verify();
    // });

    it('タスクエクスポート待ちの取引があれば、エクスポートされるはず', async () => {
        const transactionRepo = new kwskfs.repository.Transaction(kwskfs.mongoose.connection);
        const taskRepo = new kwskfs.repository.Task(kwskfs.mongoose.connection);

        const status = kwskfs.factory.transactionStatusType.Confirmed;
        const task = {};
        const transaction = {
            id: 'transactionId',
            status: status
        };

        sandbox.mock(transactionRepo).expects('startExportTasks').once().resolves(transaction);
        sandbox.mock(transactionRepo).expects('findById').once().resolves(transaction);
        sandbox.mock(taskRepo).expects('save').atLeast(1).resolves(task);
        sandbox.mock(transactionRepo).expects('setTasksExportedById').once().withArgs(transaction.id).resolves();

        const result = await kwskfs.service.transaction.placeOrder.exportTasks(
            status
        )({
            task: taskRepo,
            transaction: transactionRepo
        });

        assert.equal(result, undefined);
        sandbox.verify();
    });

    it('タスクエクスポート待ちの取引がなければ、何もしないはず', async () => {
        const status = kwskfs.factory.transactionStatusType.Confirmed;
        const transactionRepo = new kwskfs.repository.Transaction(kwskfs.mongoose.connection);
        const taskRepo = new kwskfs.repository.Task(kwskfs.mongoose.connection);

        sandbox.mock(transactionRepo).expects('startExportTasks').once().resolves(null);
        sandbox.mock(kwskfs.service.transaction.placeOrder).expects('exportTasksById').never();
        sandbox.mock(transactionRepo).expects('setTasksExportedById').never();

        const result = await kwskfs.service.transaction.placeOrder.exportTasks(
            status
        )({
            task: taskRepo,
            transaction: transactionRepo
        });

        assert.equal(result, undefined);
        sandbox.verify();
    });
});

describe('exportTasksById()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    // it('確定取引であれば1つのタスクがエクスポートされるはず', async () => {
    //     const numberOfTasks = 1;
    //     const transaction = {
    //         id: 'transactionId',
    //         status: kwskfs.factory.transactionStatusType.Confirmed
    //     };
    //     const transactionRepo = new kwskfs.repository.Transaction(kwskfs.mongoose.connection);
    //     const taskRepo = new kwskfs.repository.Task(kwskfs.mongoose.connection);

    //     sandbox.mock(transactionRepo).expects('findById').once()
    //         .withExactArgs(transaction.id).resolves(transaction);
    //     sandbox.mock(taskRepo).expects('save').exactly(numberOfTasks).resolves();

    //     const result = await kwskfs.service.transaction.placeOrder.exportTasksById(
    //         transaction.id
    //     )({
    //         task: taskRepo,
    //         transaction: transactionRepo
    //     });

    //     assert(Array.isArray(result));
    //     assert.equal(result.length, numberOfTasks);
    //     sandbox.verify();
    // });

    // it('期限切れ取引であれば2つのタスクがエクスポートされるはず', async () => {
    //     const numberOfTasks = 2;
    //     const transaction = {
    //         id: 'transactionId',
    //         status: kwskfs.factory.transactionStatusType.Expired
    //     };
    //     const transactionRepo = new kwskfs.repository.Transaction(kwskfs.mongoose.connection);
    //     const taskRepo = new kwskfs.repository.Task(kwskfs.mongoose.connection);

    //     sandbox.mock(transactionRepo).expects('findById').once()
    //         .withExactArgs(transaction.id).resolves(transaction);
    //     sandbox.mock(taskRepo).expects('save').exactly(numberOfTasks).resolves();

    //     const result = await kwskfs.service.transaction.placeOrder.exportTasksById(
    //         transaction.id
    //     )({
    //         task: taskRepo,
    //         transaction: transactionRepo
    //     });

    //     assert(Array.isArray(result));
    //     assert.equal(result.length, numberOfTasks);
    //     sandbox.verify();
    // });
});

describe('download', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('DBが正常であれば、成立取引をダウンロードできるはず', async () => {
        const conditions = {
            startFrom: new Date(),
            startThrough: new Date()
        };
        const transactions = [{
            id: 'id',
            status: kwskfs.factory.transactionStatusType.Confirmed,
            seller: {},
            agent: {},
            startDate: new Date(),
            endDate: new Date(),
            object: {
                customerContact: {}
            },
            result: {
                order: {
                    confirmationNumber: 123,
                    acceptedOffers: [{
                        itemOffered: {
                            reservationFor: {
                                superEvent: {
                                    workPerformed: {},
                                    location: {
                                        name: {}
                                    }
                                },
                                startDate: new Date(),
                                endDate: new Date(),
                                location: {
                                    name: {}
                                }
                            },
                            reservedTicket: {
                                ticketedSeat: {},
                                coaTicketInfo: {}
                            }
                        }
                    }],
                    paymentMethods: [{
                        name: 'name',
                        paymentMethodId: 'paymentMethodId'
                    }],
                    discounts: [{
                        name: 'name',
                        discountCode: 'discountCode',
                        discount: 123
                    }]
                }
            }
        }];

        const transactionRepo = new kwskfs.repository.Transaction(kwskfs.mongoose.connection);

        sandbox.mock(transactionRepo).expects('searchPlaceOrder').once().resolves(transactions);

        const result = await kwskfs.service.transaction.placeOrder.download(
            conditions,
            'csv'
        )({ transaction: transactionRepo });

        assert(typeof result === 'string');
        sandbox.verify();
    });

    it('undefined属性は空文字列としてcsvに補完されるはず', async () => {
        const conditions = {
            startFrom: new Date(),
            startThrough: new Date()
        };
        const transactions = [
            {
                id: 'id',
                status: kwskfs.factory.transactionStatusType.Confirmed,
                seller: {},
                agent: {},
                object: {
                    customerContact: {}
                },
                result: {
                    order: {
                        confirmationNumber: 123,
                        acceptedOffers: [{
                            itemOffered: {
                                reservationFor: {
                                    superEvent: {
                                        workPerformed: {},
                                        location: {
                                            name: {}
                                        }
                                    },
                                    startDate: new Date(),
                                    endDate: new Date(),
                                    location: {
                                        name: {}
                                    }
                                },
                                reservedTicket: {
                                    ticketedSeat: {},
                                    coaTicketInfo: {}
                                }
                            }
                        }],
                        paymentMethods: [{
                            name: 'name',
                            paymentMethodId: 'paymentMethodId'
                        }],
                        discounts: [{
                            name: 'name',
                            discountCode: 'discountCode',
                            discount: 123
                        }]
                    }
                }
            },
            {
                id: 'id',
                status: kwskfs.factory.transactionStatusType.Expired,
                seller: {},
                agent: {
                    memberOf: { membershipNumber: 'membershipNumber' }
                },
                object: {
                }
            },
            {
                id: 'id',
                status: kwskfs.factory.transactionStatusType.Expired,
                seller: {},
                agent: {},
                object: {
                }
            }
        ];

        const transactionRepo = new kwskfs.repository.Transaction(kwskfs.mongoose.connection);

        sandbox.mock(transactionRepo).expects('searchPlaceOrder').once().resolves(transactions);

        const result = await kwskfs.service.transaction.placeOrder.download(
            conditions,
            'csv'
        )({ transaction: transactionRepo });

        assert(typeof result === 'string');
        sandbox.verify();
    });

    it('DBが正常であれば、成立以外の取引をダウンロードできるはず', async () => {
        const conditions = {
            startFrom: new Date(),
            startThrough: new Date()
        };
        const transactions = [{
            id: 'id',
            status: kwskfs.factory.transactionStatusType.Confirmed,
            seller: {},
            agent: {},
            startDate: new Date(),
            endDate: new Date(),
            object: {
                customerContact: {}
            }
        }];

        const transactionRepo = new kwskfs.repository.Transaction(kwskfs.mongoose.connection);

        sandbox.mock(transactionRepo).expects('searchPlaceOrder').once().resolves(transactions);

        const result = await kwskfs.service.transaction.placeOrder.download(
            conditions,
            'csv'
        )({ transaction: transactionRepo });

        assert(typeof result === 'string');
        sandbox.verify();
    });

    it('非対応フォーマットを指定すればNotImplementedエラーとなるはず', async () => {
        const conditions = {
            startFrom: new Date(),
            startThrough: new Date()
        };
        const transactions: any[] = [];

        const transactionRepo = new kwskfs.repository.Transaction(kwskfs.mongoose.connection);

        sandbox.mock(transactionRepo).expects('searchPlaceOrder').once().resolves(transactions);

        const result = await kwskfs.service.transaction.placeOrder.download(
            conditions,
            <any>'invalidformat'
        )({ transaction: transactionRepo }).catch((err) => err);

        assert(result instanceof kwskfs.factory.errors.NotImplemented);
        sandbox.verify();
    });
});
