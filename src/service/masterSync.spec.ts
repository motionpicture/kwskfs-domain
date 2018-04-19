// tslint:disable:no-implicit-dependencies
/**
 * masterSync service test
 * @ignore
 */

import * as COA from '@motionpicture/coa-service';
import * as factory from '@motionpicture/kwskfs-factory';
import * as mongoose from 'mongoose';
import * as assert from 'power-assert';
import * as sinon from 'sinon';

import { MongoRepository as CreativeWorkRepo } from '../repo/creativeWork';
import { MongoRepository as EventRepo } from '../repo/event';
import { MongoRepository as PlaceRepo } from '../repo/place';
import * as MasterSyncService from './masterSync';

let sandbox: sinon.SinonSandbox;

before(() => {
    sandbox = sinon.sandbox.create();
});

describe('importMovies()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('repositoryの状態が正常であれば、エラーにならないはず', async () => {
        const filmsFromCOA = [
            {
                titleCode: 'titleCode',
                titleBranchNum: 'titleBranchNum'
            },
            {
                titleCode: 'titleCode',
                titleBranchNum: 'titleBranchNum'
            }
        ];
        const movie = {};
        const creativeWorkRepo = new CreativeWorkRepo(mongoose.connection);

        sandbox.mock(COA.services.master).expects('title').once().resolves(filmsFromCOA);
        sandbox.mock(factory.creativeWork.movie).expects('createFromCOA').exactly(filmsFromCOA.length).returns(movie);
        sandbox.mock(creativeWorkRepo).expects('saveMovie').exactly(filmsFromCOA.length).resolves();

        const result = await MasterSyncService.importMovies('123')({ creativeWork: creativeWorkRepo });
        assert.equal(result, undefined);
        sandbox.verify();
    });
});

describe('importScreeningEvents()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('repositoryの状態が正常であれば、エラーにならないはず', async () => {
        const movieTheater = {
            containsPlace: [
                { branchCode: '01' },
                { branchCode: '02' }
            ]
        };
        const filmFromCOA = [
            {
                titleCode: 'titleCode',
                titleBranchNum: 'titleBranchNum'
            }
        ];
        const schedulesFromCOA = [
            {
                titleCode: 'titleCode',
                titleBranchNum: 'titleBranchNum',
                screenCode: '01'
            },
            {
                titleCode: 'titleCode',
                titleBranchNum: 'titleBranchNum',
                screenCode: '02'
            }
        ];
        const screeningEvent = {
            identifier: 'identifier'
        };
        const individualScreeningEvent = {
            identifier: 'identifier'
        };
        const individualScreeningEventsInMongo = [
            { identifier: individualScreeningEvent.identifier },
            { identifier: 'cancellingIdentifier' }
        ];
        const eventRepo = new EventRepo(mongoose.connection);
        const placeRepo = new PlaceRepo(mongoose.connection);

        sandbox.mock(COA.services.master).expects('title').once().resolves(filmFromCOA);
        sandbox.mock(COA.services.master).expects('schedule').once().resolves(schedulesFromCOA);
        // tslint:disable-next-line:no-magic-numbers
        sandbox.mock(COA.services.master).expects('kubunName').exactly(6).resolves([{}]);
        sandbox.mock(eventRepo).expects('saveScreeningEvent').exactly(filmFromCOA.length);
        sandbox.mock(factory.event.screeningEvent).expects('createFromCOA').exactly(filmFromCOA.length)
            .returns(screeningEvent);
        sandbox.mock(placeRepo).expects('findMovieTheaterByBranchCode').once().returns(movieTheater);
        sandbox.mock(factory.event.screeningEvent).expects('createIdentifier').exactly(schedulesFromCOA.length)
            .returns(screeningEvent.identifier);
        sandbox.mock(factory.event.individualScreeningEvent).expects('createFromCOA').exactly(schedulesFromCOA.length)
            .returns(individualScreeningEvent);
        sandbox.mock(eventRepo).expects('saveIndividualScreeningEvent').exactly(schedulesFromCOA.length);
        sandbox.mock(eventRepo).expects('searchIndividualScreeningEvents').once().resolves(individualScreeningEventsInMongo);
        sandbox.mock(eventRepo).expects('cancelIndividualScreeningEvent').once().withExactArgs('cancellingIdentifier');

        const result = await MasterSyncService.importScreeningEvents(
            '123', new Date(), new Date()
        )({ event: eventRepo, place: placeRepo });

        assert.equal(result, undefined);
        sandbox.verify();
    });

    it('劇場に存在しないスクリーンのスケジュールがあれば、エラー出力だけしてスルーするはず', async () => {
        const movieTheater = {
            containsPlace: [
                { branchCode: '01' },
                { branchCode: '02' }
            ]
        };
        const filmFromCOA = [
            {
                titleCode: 'titleCode',
                titleBranchNum: 'titleBranchNum'
            }
        ];
        const schedulesFromCOA = [
            {
                titleCode: 'titleCode',
                titleBranchNum: 'titleBranchNum',
                screenCode: 'screenCode'
            }
        ];
        const screeningEvent = {
            identifier: 'identifier'
        };
        const eventRepo = new EventRepo(mongoose.connection);
        const placeRepo = new PlaceRepo(mongoose.connection);

        sandbox.mock(COA.services.master).expects('title').once().resolves(filmFromCOA);
        sandbox.mock(COA.services.master).expects('schedule').once().resolves(schedulesFromCOA);
        // tslint:disable-next-line:no-magic-numbers
        sandbox.mock(COA.services.master).expects('kubunName').exactly(6).resolves([{}]);
        sandbox.mock(eventRepo).expects('saveScreeningEvent').exactly(filmFromCOA.length);
        sandbox.mock(factory.event.screeningEvent).expects('createFromCOA').exactly(filmFromCOA.length)
            .returns(screeningEvent);
        sandbox.mock(placeRepo).expects('findMovieTheaterByBranchCode').once().returns(movieTheater);
        sandbox.mock(factory.event.screeningEvent).expects('createIdentifier').exactly(schedulesFromCOA.length)
            .returns(screeningEvent.identifier);
        sandbox.mock(factory.event.individualScreeningEvent).expects('createFromCOA').never();
        sandbox.mock(eventRepo).expects('saveIndividualScreeningEvent').never();
        sandbox.mock(eventRepo).expects('searchIndividualScreeningEvents').once().resolves([]);

        const result = await MasterSyncService.importScreeningEvents(
            '123', new Date(), new Date()
        )({ event: eventRepo, place: placeRepo });

        assert.equal(result, undefined);
        sandbox.verify();
    });

    it('上映イベントがなければ、個々の上映イベントは保管せずにスルーするはず', async () => {
        const movieTheater = {
            containsPlace: [
                { branchCode: '01' },
                { branchCode: '02' }
            ]
        };
        const filmFromCOA = [
            {
                titleCode: 'titleCode',
                titleBranchNum: 'titleBranchNum'
            }
        ];
        const schedulesFromCOA = [
            {
                titleCode: 'titleCode',
                titleBranchNum: 'titleBranchNum',
                screenCode: '01'
            },
            {
                titleCode: 'titleCode',
                titleBranchNum: 'titleBranchNum',
                screenCode: '02'
            }
        ];
        const screeningEvent = {
            identifier: 'identifier'
        };
        const eventRepo = new EventRepo(mongoose.connection);
        const placeRepo = new PlaceRepo(mongoose.connection);

        sandbox.mock(COA.services.master).expects('title').once().resolves(filmFromCOA);
        sandbox.mock(COA.services.master).expects('schedule').once().resolves(schedulesFromCOA);
        // tslint:disable-next-line:no-magic-numbers
        sandbox.mock(COA.services.master).expects('kubunName').exactly(6).resolves([{}]);
        sandbox.mock(eventRepo).expects('saveScreeningEvent').exactly(filmFromCOA.length);
        sandbox.mock(factory.event.screeningEvent).expects('createFromCOA').exactly(filmFromCOA.length)
            .returns(screeningEvent);
        sandbox.mock(placeRepo).expects('findMovieTheaterByBranchCode').once().returns(movieTheater);
        sandbox.mock(factory.event.screeningEvent).expects('createIdentifier').exactly(schedulesFromCOA.length)
            .returns('invalidIdentifier');
        sandbox.mock(factory.event.individualScreeningEvent).expects('createFromCOA').never();
        sandbox.mock(eventRepo).expects('saveIndividualScreeningEvent').never();
        sandbox.mock(eventRepo).expects('searchIndividualScreeningEvents').once().resolves([]);

        const result = await MasterSyncService.importScreeningEvents(
            '123', new Date(), new Date()
        )({ event: eventRepo, place: placeRepo });

        assert.equal(result, undefined);
        sandbox.verify();
    });
});

describe('importMovieTheater()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('repositoryの状態が正常であれば、エラーにならないはず', async () => {
        const placeRepo = new PlaceRepo(mongoose.connection);

        sandbox.mock(placeRepo).expects('saveMovieTheater').once();
        sandbox.stub(COA.services.master, 'theater').returns({});
        sandbox.stub(COA.services.master, 'screen').returns({});
        sandbox.stub(factory.place.movieTheater, 'createFromCOA').returns({});

        const result = await MasterSyncService.importMovieTheater('123')(placeRepo);

        assert.equal(result, undefined);
        sandbox.verify();
    });
});
