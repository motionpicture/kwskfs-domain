// tslint:disable:no-implicit-dependencies

/**
 * event repository test
 * @ignore
 */

import { } from 'mocha';
import * as assert from 'power-assert';
import * as sinon from 'sinon';
import { } from 'sinon-mongoose';
// tslint:disable-next-line:no-require-imports no-var-requires
require('sinon-mongoose');
import * as kwskfs from '../index';

let sandbox: sinon.SinonSandbox;

before(() => {
    sandbox = sinon.sandbox.create();
});

describe('saveScreeningEvent()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('repositoryの状態が正常であれば、保管できるはず', async () => {
        const event = { identifier: 'identifier' };

        const repository = new kwskfs.repository.Event(kwskfs.mongoose.connection);

        sandbox.mock(repository.eventModel).expects('findOneAndUpdate').once()
            .chain('exec').resolves();

        const result = await repository.saveScreeningEvent(<any>event);

        assert.equal(result, undefined);
        sandbox.verify();
    });
});

describe('saveIndividualScreeningEvent()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('repositoryの状態が正常であれば、保管できるはず', async () => {
        const event = { identifier: 'identifier' };

        const repository = new kwskfs.repository.Event(kwskfs.mongoose.connection);

        sandbox.mock(repository.eventModel).expects('findOneAndUpdate').once()
            .chain('exec').resolves();

        const result = await repository.saveIndividualScreeningEvent(<any>event);

        assert.equal(result, undefined);
        sandbox.verify();
    });
});

describe('searchIndividualScreeningEvents()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('repositoryの状態が正常であれば、配列が返却されるはず', async () => {
        const conditions = {
            theater: 'theater',
            day: '20171114',
            superEventLocationIdentifiers: ['superEventLocationIdentifier'],
            eventStatuses: ['eventStatus'],
            workPerformedIdentifiers: ['workPerformedIdentifier'],
            startFrom: new Date(),
            startThrough: new Date(),
            endFrom: new Date(),
            endThrough: new Date()
        };
        const numberOfEvents = 123;

        const repository = new kwskfs.repository.Event(kwskfs.mongoose.connection);
        const docs = Array.from(Array(numberOfEvents).map(() => new repository.eventModel()));

        sandbox.mock(repository.eventModel).expects('find').once()
            .chain('exec').resolves(docs);

        const result = await repository.searchIndividualScreeningEvents(<any>conditions);

        assert(Array.isArray(result));
        assert.equal(result.length, numberOfEvents);
        sandbox.verify();
    });
});

describe('findIndividualScreeningEventByIdentifier()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('repositoryの状態が正常であれば、オブジェクトが返却されるはず', async () => {
        const identifier = 'identifier';

        const repository = new kwskfs.repository.Event(kwskfs.mongoose.connection);
        const doc = new repository.eventModel();

        sandbox.mock(repository.eventModel).expects('findOne').once()
            .chain('exec').resolves(doc);

        const result = await repository.findIndividualScreeningEventByIdentifier(identifier);

        assert.equal(typeof result, 'object');
        sandbox.verify();
    });

    it('上映イベントが存在しなければ、NotFoundエラーとなるはず', async () => {
        const identifier = 'identifier';

        const repository = new kwskfs.repository.Event(kwskfs.mongoose.connection);

        sandbox.mock(repository.eventModel).expects('findOne').once()
            .chain('exec').resolves(null);

        const result = await repository.findIndividualScreeningEventByIdentifier(identifier).catch((err) => err);
        assert(result instanceof kwskfs.factory.errors.NotFound);
        sandbox.verify();
    });
});

describe('cancelIndividualScreeningEvent()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('repositoryの状態が正常であれば、エラーにならないはず', async () => {
        const identifier = 'identifier';

        const repository = new kwskfs.repository.Event(kwskfs.mongoose.connection);
        const doc = new repository.eventModel();

        sandbox.mock(repository.eventModel).expects('findOneAndUpdate').once()
            .chain('exec').resolves(doc);

        const result = await repository.cancelIndividualScreeningEvent(identifier);

        assert.equal(result, undefined);
        sandbox.verify();
    });
});
