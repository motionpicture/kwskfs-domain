/**
 * 会員連絡先サービステスト
 * @ignore
 */

import { errors } from '@motionpicture/kwskfs-factory';
import * as AWS from 'aws-sdk';
import * as assert from 'power-assert';
import * as sinon from 'sinon';

import * as PersonContactService from './contact';

let sandbox: sinon.SinonSandbox;

before(() => {
    sandbox = sinon.sandbox.create();
});

describe('PersonContactService.retrieve()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('AWSが正常であれば、オブジェクトを取得できるはず', async () => {
        const accessToken = 'accessToken';
        const userData = {
            UserAttributes: [
                { Name: 'given_name', Value: 'given_name' },
                { Name: 'family_name', Value: 'family_name' },
                { Name: 'email', Value: 'test@example.com' },
                { Name: 'phone_number', Value: '+819012345678' },
                { Name: 'unknown_name', Value: 'unknown' }
            ]
        };
        const cognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider();

        sandbox.mock(AWS).expects('CognitoIdentityServiceProvider').once().returns(cognitoIdentityServiceProvider);
        sandbox.mock(cognitoIdentityServiceProvider).expects('getUser').once()
            .callsArgWith(1, null, userData);

        const result = await PersonContactService.retrieve(accessToken)();
        assert.equal(typeof result, 'object');
        sandbox.verify();
    });

    it('ユーザー属性がundefinedでも、オブジェクトを取得できるはず', async () => {
        const accessToken = 'accessToken';
        const userData = {
            UserAttributes: [
                { Name: 'given_name' },
                { Name: 'family_name' },
                { Name: 'email' },
                { Name: 'phone_number' }
            ]
        };
        const cognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider();

        sandbox.mock(AWS).expects('CognitoIdentityServiceProvider').once().returns(cognitoIdentityServiceProvider);
        sandbox.mock(cognitoIdentityServiceProvider).expects('getUser').once()
            .callsArgWith(1, null, userData);

        const result = await PersonContactService.retrieve(accessToken)();
        assert.equal(typeof result, 'object');
        sandbox.verify();
    });

    it('AWSがエラーを投げれば、そのままエラーになるはず', async () => {
        const accessToken = 'accessToken';
        const error = new Error('AWSError');
        const cognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider();

        sandbox.mock(AWS).expects('CognitoIdentityServiceProvider').once().returns(cognitoIdentityServiceProvider);
        sandbox.mock(cognitoIdentityServiceProvider).expects('getUser').once()
            .callsArgWith(1, error);

        const result = await PersonContactService.retrieve(accessToken)().catch((err) => err);
        assert(result instanceof Error);
        sandbox.verify();
    });
});

describe('PersonContactService.update()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('AWSが正常であれば、voidを返すはず', async () => {
        const accessToken = 'accessToken';
        const contact = {
            givenName: 'givenName',
            familyName: 'familyName',
            telephone: '+819012345678',
            email: 'test@example.com'
        };
        const cognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider();

        sandbox.mock(AWS).expects('CognitoIdentityServiceProvider').once().returns(cognitoIdentityServiceProvider);
        sandbox.mock(cognitoIdentityServiceProvider).expects('updateUserAttributes').once()
            .callsArgWith(1, null);

        const result = await PersonContactService.update(accessToken, contact)();
        assert.equal(result, undefined);
        sandbox.verify();
    });

    it('AWSがエラーを投げれば、Argumentエラーになるはず', async () => {
        const accessToken = 'accessToken';
        const contact = {
            givenName: 'givenName',
            familyName: 'familyName',
            telephone: '+819012345678',
            email: 'test@example.com'
        };
        const error = new Error('AWSError');
        const cognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider();

        sandbox.mock(AWS).expects('CognitoIdentityServiceProvider').once().returns(cognitoIdentityServiceProvider);
        sandbox.mock(cognitoIdentityServiceProvider).expects('updateUserAttributes').once()
            .callsArgWith(1, error);

        const result = await PersonContactService.update(accessToken, contact)().catch((err) => err);
        assert(result instanceof errors.Argument);
        sandbox.verify();
    });

    it('電話番号のフォーマットが不適切であれば、Argumentエラーになるはず', async () => {
        const accessToken = 'accessToken';
        const contact = {
            givenName: 'givenName',
            familyName: 'familyName',
            telephone: '123',
            email: 'test@example.com'
        };

        sandbox.mock(AWS).expects('CognitoIdentityServiceProvider').never();

        const result = await PersonContactService.update(accessToken, contact)().catch((err) => err);
        console.error(result);
        assert(result instanceof errors.Argument);
        sandbox.verify();
    });
});
