// tslint:disable:no-implicit-dependencies

/**
 * レポートサービステスト
 * @ignore
 */

import * as assert from 'power-assert';
import * as sinon from 'sinon';
// tslint:disable-next-line:no-require-imports no-var-requires
require('sinon-mongoose');

import * as kwskfs from '../index';

let sandbox: sinon.SinonSandbox;

before(() => {
    sandbox = sinon.sandbox.create();
});

describe('service.report.telemetry.search()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('DBが正常であれば、配列を取得できるはず', async () => {
        const conditions = {};
        const telemetries: any[] = [];
        const telemetryRepo = new kwskfs.repository.Telemetry(kwskfs.mongoose.connection);

        sandbox.mock(telemetryRepo.telemetryModel).expects('find').once()
            .chain('sort').chain('lean').chain('exec').resolves(telemetries);

        const result = await kwskfs.service.report.telemetry.search(<any>conditions)({ telemetry: telemetryRepo });

        assert(Array.isArray(result));
        sandbox.verify();
    });
});

// describe('service.report.createTelemetry()', () => {
//     afterEach(() => {
//         sandbox.restore();
//     });

//     it('DBが正常であれば、エラーにならないはず', async () => {
//         const taskRepo = new kwskfs.repository.Task(kwskfs.mongoose.connection);
//         const telemetryRepo = new kwskfs.repository.Telemetry(kwskfs.mongoose.connection);
//         const transactionRepo = new kwskfs.repository.Transaction(kwskfs.mongoose.connection);

//         sandbox.mock(taskRepo.taskModel).expects('count').atLeast(1)
//             .chain('exec').resolves(1);
//         sandbox.mock(transactionRepo.transactionModel).expects('count').atLeast(1)
//             .chain('exec').resolves(1);
//         sandbox.mock(taskRepo.taskModel).expects('find').atLeast(1)
//             .chain('exec').resolves([]);
//         sandbox.mock(transactionRepo.transactionModel).expects('find').atLeast(1)
//             .chain('exec').resolves([]);
//         sandbox.mock(telemetryRepo.telemetryModel).expects('create').once().resolves({});

//         const result = await kwskfs.service.report.createTelemetry()(taskRepo, telemetryRepo, transactionRepo);

//         assert.equal(result, undefined);
//         sandbox.verify();
//     });
// });
