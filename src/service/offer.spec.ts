// tslint:disable:no-implicit-dependencies

/**
 * 販売情報サービステスト
 * @ignore
 */

import * as mongoose from 'mongoose';
import * as assert from 'power-assert';
import * as sinon from 'sinon';

import { MongoRepository as EventRepo } from '../repo/event';
import { MongoRepository as ScreeningEventItemAvailabilityRepo } from '../repo/itemAvailability/individualScreeningEvent';
import * as OfferService from './offer';

let sandbox: sinon.SinonSandbox;

before(() => {
    sandbox = sinon.sandbox.create();
});

describe('searchIndividualScreeningEvents()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('repositoryの状態が正常であれば、エラーにならないはず', async () => {
        const event = {
            coaInfo: {
                dateJouei: '20170831'
            },
            identifier: 'identifier'
        };
        const events = [event];
        const searchConditions = {
            superEventLocationIdentifiers: ['12345']
        };
        const eventRepo = new EventRepo(mongoose.connection);
        const itemAvailabilityRepo = new ScreeningEventItemAvailabilityRepo(<any>{});

        sandbox.mock(eventRepo).expects('searchIndividualScreeningEvents').once().resolves(events);
        // tslint:disable-next-line:no-magic-numbers
        sandbox.mock(itemAvailabilityRepo).expects('findOne').exactly(events.length).resolves(100);

        const result = await OfferService.searchIndividualScreeningEvents(searchConditions)({
            event: eventRepo,
            itemAvailability: itemAvailabilityRepo
        });
        assert(Array.isArray(result));
        assert.equal(result.length, events.length);
        sandbox.verify();
    });
});

describe('findIndividualScreeningEventByIdentifier()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('repositoryの状態が正常であれば、エラーにならないはず', async () => {
        const event = {
            coaInfo: {
                dateJouei: '20170831'
            },
            identifier: 'identifier'
        };
        const eventRepo = new EventRepo(mongoose.connection);
        const itemAvailabilityRepo = new ScreeningEventItemAvailabilityRepo(<any>{});

        sandbox.mock(eventRepo).expects('findIndividualScreeningEventByIdentifier').once().resolves(event);
        // tslint:disable-next-line:no-magic-numbers
        sandbox.mock(itemAvailabilityRepo).expects('findOne').once().resolves(100);

        const result = await OfferService.findIndividualScreeningEventByIdentifier(
            event.identifier
        )({
            event: eventRepo,
            itemAvailability: itemAvailabilityRepo
        });

        assert.equal(result.identifier, event.identifier);
        sandbox.verify();
    });
});
