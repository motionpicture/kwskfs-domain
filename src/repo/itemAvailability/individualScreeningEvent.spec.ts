// tslint:disable:no-implicit-dependencies

/**
 * individualScreeningEvent itemAvailability repository test
 * @ignore
 */

import { } from 'mocha';
import * as assert from 'power-assert';
import * as redis from 'redis-mock';
import * as sinon from 'sinon';
// tslint:disable-next-line:no-require-imports no-var-requires
require('sinon-mongoose');
import * as kwskfs from '../../index';

let sandbox: sinon.SinonSandbox;

before(() => {
    sandbox = sinon.sandbox.create();
});

describe('findOne()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('データが存在してBufferとして取得できれば数値が返却されるはず', async () => {
        const screeningDay = 'screeningDay';
        const eventIdentifier = 'eventIdentifier';
        const availability = 99;

        const repository = new kwskfs.repository.itemAvailability.IndividualScreeningEvent(redis.createClient());
        (<any>repository.redisClient.hget) = (__: any, cb: Function) => {
            cb(null, new Buffer(availability.toString()));
        };

        const result = await repository.findOne(screeningDay, eventIdentifier);

        assert.equal(typeof result, 'number');
        assert.equal(result, availability);
        sandbox.verify();
    });

    it('データが存在して文字列として取得できれば数値が返却されるはず', async () => {
        const screeningDay = 'screeningDay';
        const eventIdentifier = 'eventIdentifier';
        const availability = 99;

        const repository = new kwskfs.repository.itemAvailability.IndividualScreeningEvent(redis.createClient());
        (<any>repository.redisClient.hget) = (__: any, cb: Function) => {
            cb(null, availability.toString());
        };

        const result = await repository.findOne(screeningDay, eventIdentifier);

        assert.equal(typeof result, 'number');
        assert.equal(result, availability);
        sandbox.verify();
    });

    it('データが存在しなければ、nullが返却されるはず', async () => {
        const screeningDay = 'screeningDay';
        const eventIdentifier = 'eventIdentifier';

        const repository = new kwskfs.repository.itemAvailability.IndividualScreeningEvent(redis.createClient());
        (<any>repository.redisClient.hget) = (__: any, cb: Function) => {
            cb(null, null);
        };

        const result = await repository.findOne(screeningDay, eventIdentifier);

        assert.equal(result, null);
        sandbox.verify();
    });

    it('Redisが正常でなければ、エラーが投げられるはず', async () => {
        const screeningDay = 'screeningDay';
        const eventIdentifier = 'eventIdentifier';
        const redisError = new Error('manual error');

        const repository = new kwskfs.repository.itemAvailability.IndividualScreeningEvent(redis.createClient());
        (<any>repository.redisClient.hget) = (__: any, cb: Function) => {
            cb(redisError);
        };

        const result = await repository.findOne(screeningDay, eventIdentifier).catch((err) => err);

        assert.equal(result, redisError);
        sandbox.verify();
    });
});

describe('updateOne()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('Redisの状態が正常であれば、エラーにならないはず', async () => {
        const screeningDay = 'screeningDay';
        const eventIdentifier = 'eventIdentifier';
        const availability = 99;

        const repository = new kwskfs.repository.itemAvailability.IndividualScreeningEvent(redis.createClient());
        (<any>repository.redisClient.hset) = (__: any, cb: Function) => {
            cb(null);
        };

        const result = await repository.updateOne(screeningDay, eventIdentifier, availability);

        assert.equal(result, undefined);
        sandbox.verify();
    });

    it('Redisが正常でなければ、エラーが投げられるはず', async () => {
        const screeningDay = 'screeningDay';
        const eventIdentifier = 'eventIdentifier';
        const availability = 99;
        const redisError = new Error('manual error');

        const repository = new kwskfs.repository.itemAvailability.IndividualScreeningEvent(redis.createClient());
        (<any>repository.redisClient.hset) = (__: any, cb: Function) => {
            cb(redisError);
        };

        const result = await repository.updateOne(screeningDay, eventIdentifier, availability).catch((err) => err);

        assert.equal(result, redisError);
        sandbox.verify();
    });
});

describe('removeByPerformaceDay()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('Redisの状態が正常であれば、エラーにならないはず', async () => {
        const screeningDay = 'screeningDay';

        const repository = new kwskfs.repository.itemAvailability.IndividualScreeningEvent(redis.createClient());
        (<any>repository.redisClient.del) = (__: any, cb: Function) => {
            cb(null);
        };

        const result = await repository.removeByPerformaceDay(screeningDay);

        assert.equal(result, undefined);
        sandbox.verify();
    });

    it('Redisが正常でなければ、エラーが投げられるはず', async () => {
        const screeningDay = 'screeningDay';
        const redisError = new Error('manual error');

        const repository = new kwskfs.repository.itemAvailability.IndividualScreeningEvent(redis.createClient());
        (<any>repository.redisClient.del) = (__: any, cb: Function) => {
            cb(redisError);
        };

        const result = await repository.removeByPerformaceDay(screeningDay).catch((err) => err);

        assert.equal(result, redisError);
        sandbox.verify();
    });
});

describe('setTTLIfNotExist()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('期限が未設定であれば、セットされるはず', async () => {
        const screeningDay = 'screeningDay';

        const repository = new kwskfs.repository.itemAvailability.IndividualScreeningEvent(redis.createClient());
        (<any>repository.redisClient.ttl) = (__: any, cb: Function) => {
            cb(null, -1);
        };
        (<any>repository.redisClient.expire) = (__: any, cb: Function) => {
            cb(null);
        };

        const result = await repository.setTTLIfNotExist(screeningDay);

        assert.equal(result, undefined);
        sandbox.verify();
    });

    it('redisClient.ttlが正常でなければ、エラーが投げられるはず', async () => {
        const screeningDay = 'screeningDay';
        const redisError = new Error('manual error');

        const repository = new kwskfs.repository.itemAvailability.IndividualScreeningEvent(redis.createClient());
        (<any>repository.redisClient.ttl) = (__: any, cb: Function) => {
            cb(redisError);
        };
        (<any>repository.redisClient.expire) = (__: any, cb: Function) => {
            cb(null);
        };

        const result = await repository.setTTLIfNotExist(screeningDay).catch((err) => err);

        assert.equal(result, redisError);
        sandbox.verify();
    });

    it('期限設定済であれば、セットしないはず', async () => {
        const screeningDay = 'screeningDay';
        const ttl = 10;

        const repository = new kwskfs.repository.itemAvailability.IndividualScreeningEvent(redis.createClient());
        (<any>repository.redisClient.ttl) = (__: any, cb: Function) => {
            cb(null, ttl);
        };

        const result = await repository.setTTLIfNotExist(screeningDay);

        assert.equal(result, undefined);
        sandbox.verify();
    });
});
