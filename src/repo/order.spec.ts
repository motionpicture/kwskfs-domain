// tslint:disable:no-implicit-dependencies

/**
 * creativeWork repository test
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

describe('findByOrderInquiryKey()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('注文が存在すれば、取得できるはず', async () => {
        const orderInquiryKey = {};

        const repository = new kwskfs.repository.Order(kwskfs.mongoose.connection);

        sandbox.mock(repository.orderModel).expects('findOne').once()
            .chain('exec').resolves(new repository.orderModel());

        const result = await repository.findByOrderInquiryKey(<any>orderInquiryKey);

        assert.notEqual(result, undefined);
        sandbox.verify();
    });

    it('存在しなければ、NotFoundエラーとなるはず', async () => {
        const orderInquiryKey = {};

        const repository = new kwskfs.repository.Order(kwskfs.mongoose.connection);

        sandbox.mock(repository.orderModel).expects('findOne').once()
            .chain('exec').resolves(null);

        const result = await repository.findByOrderInquiryKey(<any>orderInquiryKey).catch((err) => err);
        assert(result instanceof kwskfs.factory.errors.NotFound);
        sandbox.verify();
    });
});

describe('createIfNotExist()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('MongoDBの状態が正常であれば、作成できるはず', async () => {
        const order = {};

        const repository = new kwskfs.repository.Order(kwskfs.mongoose.connection);

        sandbox.mock(repository.orderModel).expects('findOneAndUpdate').once()
            .chain('exec').resolves(new repository.orderModel());

        const result = await repository.createIfNotExist(<any>order);

        assert.equal(result, undefined);
        sandbox.verify();
    });
});

describe('changeStatus()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('注文が存在すればステータス変更できるはず', async () => {
        const orderNumber = 'orderNumber';
        const orderStatus = kwskfs.factory.orderStatus.OrderDelivered;

        const repository = new kwskfs.repository.Order(kwskfs.mongoose.connection);

        sandbox.mock(repository.orderModel).expects('findOneAndUpdate').once()
            .chain('exec').resolves(new repository.orderModel());

        const result = await repository.changeStatus(orderNumber, orderStatus);

        assert.equal(result, undefined);
        sandbox.verify();
    });

    it('注文が存在しなければNotFoundエラーとなるはず', async () => {
        const orderNumber = 'orderNumber';
        const orderStatus = kwskfs.factory.orderStatus.OrderDelivered;

        const repository = new kwskfs.repository.Order(kwskfs.mongoose.connection);

        sandbox.mock(repository.orderModel).expects('findOneAndUpdate').once()
            .chain('exec').resolves(null);

        const result = await repository.changeStatus(orderNumber, orderStatus)
            .catch((err) => err);

        assert(result instanceof kwskfs.factory.errors.NotFound);
        sandbox.verify();
    });
});

describe('findByOrderNumber()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('注文が存在すれば注文オブジェクトが返却されるはず', async () => {
        const order = {
            orderNumber: 'orderNumber'
        };

        const repository = new kwskfs.repository.Order(kwskfs.mongoose.connection);

        sandbox.mock(repository.orderModel).expects('findOne').once()
            .chain('exec').resolves(new repository.orderModel(order));

        const result = await repository.findByOrderNumber(order.orderNumber);

        assert.equal(result.orderNumber, order.orderNumber);
        sandbox.verify();
    });

    it('注文が存在しなければNotFoundエラーとなるはず', async () => {
        const orderNumber = 'orderNumber';

        const repository = new kwskfs.repository.Order(kwskfs.mongoose.connection);

        sandbox.mock(repository.orderModel).expects('findOne').once()
            .chain('exec').resolves(null);

        const result = await repository.findByOrderNumber(orderNumber)
            .catch((err) => err);

        assert(result instanceof kwskfs.factory.errors.NotFound);
        sandbox.verify();
    });
});
