// tslint:disable:no-implicit-dependencies

/**
 * telemetry repository test
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

describe('constructor()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('インスタンスを生成できるはず', async () => {
        const repository = new kwskfs.repository.Telemetry(kwskfs.mongoose.connection);

        assert.notEqual(typeof repository.telemetryModel, undefined);
        sandbox.verify();
    });
});
