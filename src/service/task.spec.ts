// tslint:disable:no-implicit-dependencies

/**
 * task service test
 * @ignore
 */

import * as assert from 'power-assert';
import * as sinon from 'sinon';
import * as kwskfs from '../index';

import * as TaskFunctionsService from './taskFunctions';

let sandbox: sinon.SinonSandbox;

before(() => {
    sandbox = sinon.sandbox.create();
});

describe('executeByName()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('未実行タスクが存在すれば、実行されるはず', async () => {
        const task = {
            id: 'id',
            name: kwskfs.factory.taskName.PlaceOrder,
            data: { datakey: 'dataValue' },
            status: kwskfs.factory.taskStatus.Running
        };
        const taskRepo = new kwskfs.repository.Task(kwskfs.mongoose.connection);
        const authClient = new kwskfs.pecorinoapi.auth.ClientCredentials(<any>{});
        sandbox.mock(taskRepo).expects('executeOneByName').once().withArgs(task.name).resolves(task);
        sandbox.mock(TaskFunctionsService).expects(task.name).once().withArgs(task.data).returns(async () => Promise.resolve());
        sandbox.mock(taskRepo).expects('pushExecutionResultById').once().withArgs(task.id, kwskfs.factory.taskStatus.Executed).resolves();

        const result = await kwskfs.service.task.executeByName(task.name)({
            taskRepo: taskRepo,
            connection: kwskfs.mongoose.connection,
            pecorinoAuthClient: authClient
        });

        assert.equal(result, undefined);
        sandbox.verify();
    });

    it('未実行タスクが存在しなければ、実行されないはず', async () => {
        const taskName = kwskfs.factory.taskName.PlaceOrder;
        const taskRepo = new kwskfs.repository.Task(kwskfs.mongoose.connection);
        const authClient = new kwskfs.pecorinoapi.auth.ClientCredentials(<any>{});

        sandbox.mock(taskRepo).expects('executeOneByName').once()
            .withArgs(taskName).rejects(new kwskfs.factory.errors.NotFound('task'));
        sandbox.mock(kwskfs.service.task).expects('execute').never();

        const result = await kwskfs.service.task.executeByName(taskName)({
            taskRepo: taskRepo,
            connection: kwskfs.mongoose.connection,
            pecorinoAuthClient: authClient
        });

        assert.equal(result, undefined);
        sandbox.verify();
    });
});

describe('retry()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('repositoryの状態が正常であれば、エラーにならないはず', async () => {
        const INTERVAL = 10;
        const taskRepo = new kwskfs.repository.Task(kwskfs.mongoose.connection);

        sandbox.mock(taskRepo).expects('retry').once()
            .withArgs(INTERVAL).resolves();

        const result = await kwskfs.service.task.retry(INTERVAL)({ task: taskRepo });

        assert.equal(result, undefined);
        sandbox.verify();
    });
});

describe('abort()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('repositoryの状態が正常であれば、エラーにならないはず', async () => {
        const INTERVAL = 10;
        const task = {
            id: 'id',
            executionResults: [{ error: 'error' }]
        };
        const taskRepo = new kwskfs.repository.Task(kwskfs.mongoose.connection);

        sandbox.mock(taskRepo).expects('abortOne').once().withArgs(INTERVAL).resolves(task);
        sandbox.mock(kwskfs.service.notification).expects('report2developers').once()
            .withArgs(kwskfs.service.task.ABORT_REPORT_SUBJECT).returns(async () => Promise.resolve());

        const result = await kwskfs.service.task.abort(INTERVAL)({ task: taskRepo });

        assert.equal(result, undefined);
        sandbox.verify();
    });
});

describe('execute()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('存在するタスク名であれば、完了ステータスへ変更されるはず', async () => {
        const task = {
            id: 'id',
            name: kwskfs.factory.taskName.PlaceOrder,
            data: { datakey: 'dataValue' },
            status: kwskfs.factory.taskStatus.Running
        };
        const taskRepo = new kwskfs.repository.Task(kwskfs.mongoose.connection);
        const authClient = new kwskfs.pecorinoapi.auth.ClientCredentials(<any>{});

        sandbox.mock(TaskFunctionsService).expects(task.name).once().withArgs(task.data).returns(async () => Promise.resolve());
        sandbox.mock(taskRepo).expects('pushExecutionResultById').once().withArgs(task.id, kwskfs.factory.taskStatus.Executed).resolves();

        const result = await kwskfs.service.task.execute(<any>task)({
            taskRepo: taskRepo,
            connection: kwskfs.mongoose.connection,
            pecorinoAuthClient: authClient
        });

        assert.equal(result, undefined);
        sandbox.verify();
    });

    it('存在しないタスク名であれば、ステータスは変更されないはず', async () => {
        const task = {
            id: 'id',
            name: 'invalidTaskName',
            data: { datakey: 'dataValue' },
            status: kwskfs.factory.taskStatus.Running
        };
        const taskRepo = new kwskfs.repository.Task(kwskfs.mongoose.connection);
        const authClient = new kwskfs.pecorinoapi.auth.ClientCredentials(<any>{});

        sandbox.mock(taskRepo).expects('pushExecutionResultById').once().withArgs(task.id, task.status).resolves();

        const result = await kwskfs.service.task.execute(<any>task)({
            taskRepo: taskRepo,
            connection: kwskfs.mongoose.connection,
            pecorinoAuthClient: authClient
        });

        assert.equal(result, undefined);
        sandbox.verify();
    });
});
