// tslint:disable:no-implicit-dependencies

/**
 * transaction repository test
 * @ignore
 */

import { } from 'mocha';
import * as assert from 'power-assert';
import * as sinon from 'sinon';
// tslint:disable-next-line:no-require-imports no-var-requires
require('sinon-mongoose');
import * as kwskfs from '../index';

let sandbox: sinon.SinonSandbox;

before(() => {
    sandbox = sinon.sandbox.create();
});

describe('start()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('repositoryの状態が正常であれば、開始できるはず', async () => {
        const transaction = { id: 'id' };

        const repository = new kwskfs.repository.Transaction(kwskfs.mongoose.connection);

        sandbox.mock(repository.transactionModel)
            .expects('create').once()
            .resolves(new repository.transactionModel());

        const result = await repository.start(<any>transaction);

        assert.equal(typeof result, 'object');
        sandbox.verify();
    });
});

describe('findPlaceOrderById()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('取引が存在すれば、オブジェクトが返却されるはず', async () => {
        const transactionId = 'transactionId';

        const repository = new kwskfs.repository.Transaction(kwskfs.mongoose.connection);

        sandbox.mock(repository.transactionModel)
            .expects('findOne').once()
            .chain('exec')
            .resolves(new repository.transactionModel());

        const result = await repository.findPlaceOrderById(transactionId);

        assert.equal(typeof result, 'object');
        sandbox.verify();
    });

    it('取引が存在しなければ、NotFoundエラーとなるはず', async () => {
        const transactionId = 'transactionId';

        const repository = new kwskfs.repository.Transaction(kwskfs.mongoose.connection);

        sandbox.mock(repository.transactionModel)
            .expects('findOne').once()
            .chain('exec')
            .resolves(null);

        const result = await repository.findPlaceOrderById(transactionId).catch((err) => err);
        assert(result instanceof kwskfs.factory.errors.NotFound);
        sandbox.verify();
    });
});

describe('findPlaceOrderInProgressById()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('取引が存在すれば、オブジェクトが返却されるはず', async () => {
        const transactionId = 'transactionId';

        const repository = new kwskfs.repository.Transaction(kwskfs.mongoose.connection);

        sandbox.mock(repository.transactionModel)
            .expects('findOne').once()
            .chain('exec')
            .resolves(new repository.transactionModel());

        const result = await repository.findPlaceOrderInProgressById(transactionId);

        assert.equal(typeof result, 'object');
        sandbox.verify();
    });

    it('取引が存在しなければ、NotFoundエラーとなるはず', async () => {
        const transactionId = 'transactionId';

        const repository = new kwskfs.repository.Transaction(kwskfs.mongoose.connection);

        sandbox.mock(repository.transactionModel).expects('findOne').once()
            .chain('exec').resolves(null);

        const result = await repository.findPlaceOrderInProgressById(transactionId).catch((err) => err);
        assert(result instanceof kwskfs.factory.errors.NotFound);
        sandbox.verify();
    });
});

describe('setCustomerContactOnPlaceOrderInProgress()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('取引が存在すれば、エラーにならないはず', async () => {
        const transactionId = 'transactionId';
        const contact = {};

        const repository = new kwskfs.repository.Transaction(kwskfs.mongoose.connection);

        sandbox.mock(repository.transactionModel)
            .expects('findOneAndUpdate').once()
            .chain('exec')
            .resolves(new repository.transactionModel());

        const result = await repository.setCustomerContactOnPlaceOrderInProgress(transactionId, <any>contact);

        assert.equal(result, undefined);
        sandbox.verify();
    });

    it('取引が存在しなければ、NotFoundエラーになるはず', async () => {
        const transactionId = 'transactionId';
        const contact = {};

        const repository = new kwskfs.repository.Transaction(kwskfs.mongoose.connection);

        sandbox.mock(repository.transactionModel).expects('findOneAndUpdate').once()
            .chain('exec').resolves(null);

        const result = await repository.setCustomerContactOnPlaceOrderInProgress(transactionId, <any>contact).catch((err) => err);
        assert(result instanceof kwskfs.factory.errors.NotFound);
        sandbox.verify();
    });
});

describe('confirmPlaceOrder()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('取引が存在すれば、エラーにならないはず', async () => {
        const transactionId = 'transactionId';
        const authorizeActions: any[] = [];
        const transactionResult = {};
        const potentialActions = {};

        const repository = new kwskfs.repository.Transaction(kwskfs.mongoose.connection);
        const doc = new repository.transactionModel();

        sandbox.mock(repository.transactionModel).expects('findOneAndUpdate').once()
            .chain('exec').resolves(doc);

        const result = await repository.confirmPlaceOrder(
            transactionId, authorizeActions, <any>transactionResult, <any>potentialActions
        );
        assert.equal(typeof result, 'object');
        sandbox.verify();
    });

    it('取引が存在しなければ、NotFoundエラーになるはず', async () => {
        const transactionId = 'transactionId';
        const authorizeActions: any[] = [];
        const transactionResult = {};
        const potentialActions = {};

        const repository = new kwskfs.repository.Transaction(kwskfs.mongoose.connection);

        sandbox.mock(repository.transactionModel).expects('findOneAndUpdate').once()
            .chain('exec').resolves(null);

        const result = await repository.confirmPlaceOrder(
            transactionId, authorizeActions, <any>transactionResult, <any>potentialActions
        )
            .catch((err) => err);
        assert(result instanceof kwskfs.factory.errors.NotFound);
        sandbox.verify();
    });
});

describe('reexportTasks()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('MongoDBの状態が正常であれば、エラーにならないはず', async () => {
        const intervalInMinutes = 10;

        const repository = new kwskfs.repository.Transaction(kwskfs.mongoose.connection);

        sandbox.mock(repository.transactionModel)
            .expects('findOneAndUpdate').once()
            .chain('exec')
            .resolves(new repository.transactionModel());

        const result = await repository.reexportTasks(intervalInMinutes);

        assert.equal(result, undefined);
        sandbox.verify();
    });
});

describe('setTasksExportedById()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('MongoDBの状態が正常であれば、エラーにならないはず', async () => {
        const transactionId = 'transactionId';

        const repository = new kwskfs.repository.Transaction(kwskfs.mongoose.connection);

        sandbox.mock(repository.transactionModel)
            .expects('findByIdAndUpdate').once().withArgs(transactionId)
            .chain('exec')
            .resolves(new repository.transactionModel());

        const result = await repository.setTasksExportedById(transactionId);

        assert.equal(result, undefined);
        sandbox.verify();
    });
});

describe('makeExpired()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('MongoDBの状態が正常であれば、エラーにならないはず', async () => {
        const repository = new kwskfs.repository.Transaction(kwskfs.mongoose.connection);

        sandbox.mock(repository.transactionModel)
            .expects('update').once()
            .chain('exec')
            .resolves();

        const result = await repository.makeExpired();

        assert.equal(result, undefined);
        sandbox.verify();
    });
});

describe('searchPlaceOrder()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('MongoDBの状態が正常であれば、配列を取得できるはず', async () => {
        const conditions = {};

        const repo = new kwskfs.repository.Transaction(kwskfs.mongoose.connection);
        const docs = [new repo.transactionModel()];

        sandbox.mock(repo.transactionModel).expects('find').once()
            .chain('exec').resolves(docs);

        const result = await repo.searchPlaceOrder(<any>conditions);
        assert(Array.isArray(result));
        sandbox.verify();
    });
});

describe('findReturnOrderById()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('取引が存在すればオブジェクトが返却されるはず', async () => {
        const transactionId = 'transactionId';

        const repository = new kwskfs.repository.Transaction(kwskfs.mongoose.connection);

        sandbox.mock(repository.transactionModel).expects('findOne').once()
            .chain('exec').resolves(new repository.transactionModel());

        const result = await repository.findReturnOrderById(transactionId);

        assert.equal(typeof result, 'object');
        sandbox.verify();
    });

    it('取引が存在しなければNotFoundエラーとなるはず', async () => {
        const transactionId = 'transactionId';

        const repository = new kwskfs.repository.Transaction(kwskfs.mongoose.connection);

        sandbox.mock(repository.transactionModel).expects('findOne').once()
            .chain('exec').resolves(null);

        const result = await repository.findReturnOrderById(transactionId).catch((err) => err);
        assert(result instanceof kwskfs.factory.errors.NotFound);
        sandbox.verify();
    });
});

describe('confirmReturnOrder()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('取引が存在すれば、エラーにならないはず', async () => {
        const transactionId = 'transactionId';
        const transactionResult = {};
        const potentialActions = {};

        const repository = new kwskfs.repository.Transaction(kwskfs.mongoose.connection);
        const doc = new repository.transactionModel();

        sandbox.mock(repository.transactionModel).expects('findOneAndUpdate').once()
            .chain('exec').resolves(doc);

        const result = await repository.confirmReturnOrder(
            transactionId, <any>transactionResult, <any>potentialActions
        );
        assert.equal(typeof result, 'object');
        sandbox.verify();
    });

    it('取引が存在しなければ、NotFoundエラーになるはず', async () => {
        const transactionId = 'transactionId';
        const transactionResult = {};
        const potentialActions = {};

        const repository = new kwskfs.repository.Transaction(kwskfs.mongoose.connection);

        sandbox.mock(repository.transactionModel).expects('findOneAndUpdate').once()
            .chain('exec').resolves(null);

        const result = await repository.confirmReturnOrder(
            transactionId, <any>transactionResult, <any>potentialActions
        ).catch((err) => err);
        assert(result instanceof kwskfs.factory.errors.NotFound);
        sandbox.verify();
    });
});

describe('findReturnOrderInProgressById()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('取引が存在すればオブジェクトが返却されるはず', async () => {
        const transactionId = 'transactionId';

        const repository = new kwskfs.repository.Transaction(kwskfs.mongoose.connection);

        sandbox.mock(repository.transactionModel).expects('findOne').once()
            .chain('exec').resolves(new repository.transactionModel());

        const result = await repository.findReturnOrderInProgressById(transactionId);

        assert.equal(typeof result, 'object');
        sandbox.verify();
    });

    it('取引が存在しなければNotFoundエラーとなるはず', async () => {
        const transactionId = 'transactionId';

        const repository = new kwskfs.repository.Transaction(kwskfs.mongoose.connection);

        sandbox.mock(repository.transactionModel).expects('findOne').once()
            .chain('exec').resolves(null);

        const result = await repository.findReturnOrderInProgressById(transactionId).catch((err) => err);
        assert(result instanceof kwskfs.factory.errors.NotFound);
        sandbox.verify();
    });
});

describe('startExportTasks()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('タスク未出力の取引が存在すればオブジェクトが返却されるはず', async () => {
        const transaction = {
            typeOf: kwskfs.factory.transactionType.PlaceOrder,
            id: 'transactionId',
            status: kwskfs.factory.transactionStatusType.Confirmed
        };

        const repository = new kwskfs.repository.Transaction(kwskfs.mongoose.connection);

        sandbox.mock(repository.transactionModel).expects('findOneAndUpdate').once()
            .chain('exec').resolves(new repository.transactionModel());

        const result = await repository.startExportTasks(transaction.typeOf, transaction.status);

        assert.equal(typeof result, 'object');
        sandbox.verify();
    });

    it('タスク未出力の取引が存在しなければnullを返却するはず', async () => {
        const transaction = {
            typeOf: kwskfs.factory.transactionType.PlaceOrder,
            id: 'transactionId',
            status: kwskfs.factory.transactionStatusType.Confirmed
        };

        const repository = new kwskfs.repository.Transaction(kwskfs.mongoose.connection);

        sandbox.mock(repository.transactionModel).expects('findOneAndUpdate').once()
            .chain('exec').resolves(null);

        const result = await repository.startExportTasks(transaction.typeOf, transaction.status);

        assert.equal(result, null);
        sandbox.verify();
    });
});

