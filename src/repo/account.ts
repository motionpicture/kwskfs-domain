// import * as factory from '@motionpicture/kwskfs-factory';
// import * as pecorinoapi from '@motionpicture/pecorino-api-nodejs-client';
// import * as AWS from 'aws-sdk';
// import { BAD_REQUEST, FORBIDDEN, NOT_FOUND, TOO_MANY_REQUESTS, UNAUTHORIZED } from 'http-status';

// const cognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider({
//     apiVersion: 'latest',
//     region: 'ap-northeast-1',
//     credentials: new AWS.Credentials({
//         accessKeyId: <string>process.env.AWS_ACCESS_KEY_ID,
//         secretAccessKey: <string>process.env.AWS_SECRET_ACCESS_KEY
//     })
// });

/**
 * 口座リポジトリー
 */
export class PecorinoRepository {
    /**
     * PecorinoAPIエンドポイント
     */
    public readonly endpoint: string;
    /**
     * PecorinoAPI認可サーバードメイン
     */
    public readonly authorizeServerDomain: string;

    constructor(endpoint: string, authorizeServerDomain: string) {
        this.endpoint = endpoint;
        this.authorizeServerDomain = authorizeServerDomain;
    }

    // public async findByAccessToken(accessToken: string) {
    //     let accounts: factory.pecorino.account.IAccount[];

    //     try {
    //         const accountIds = await getAccountIds(username);
    //         const authClient = new pecorinoapi.auth.OAuth2({
    //             domain: this.authorizeServerDomain
    //         });
    //         authClient.setCredentials({
    //             access_token: accessToken
    //         });
    //         const userService = new pecorinoapi.service.User({
    //             endpoint: this.endpoint,
    //             auth: authClient
    //         });

    //         accounts = await userService.findAccounts({});
    //     } catch (error) {
    //         if (error.name === 'PecorinoRequestError') {
    //             // Pecorino APIのステータスコード4xxをハンドリング
    //             const message = `${error.name}:${error.message}`;
    //             switch (error.code) {
    //                 case BAD_REQUEST: // 400
    //                     throw new factory.errors.Argument('accessToken', message);
    //                 case UNAUTHORIZED: // 401
    //                     throw new factory.errors.Unauthorized(message);
    //                 case FORBIDDEN: // 403
    //                     throw new factory.errors.Forbidden(message);
    //                 case NOT_FOUND: // 404
    //                     throw new factory.errors.NotFound(message);
    //                 case TOO_MANY_REQUESTS: // 429
    //                     throw new factory.errors.RateLimitExceeded(message);
    //                 default:
    //                     throw new factory.errors.ServiceUnavailable(message);
    //             }
    //         }

    //         throw error;
    //     }

    //     return accounts;
    // }
}

// async function getAccountIds(username: string) {
//     return new Promise<string[]>((resolve, reject) => {
//         cognitoIdentityServiceProvider.adminGetUser(
//             {
//                 UserPoolId: <string>process.env.COGNITO_USER_POOL_ID,
//                 Username: username
//             },
//             (err, data) => {
//                 if (err instanceof Error) {
//                     reject(err);
//                 } else {
//                     if (data.UserAttributes === undefined) {
//                         reject(new Error('UserAttributes not found.'));
//                     } else {
//                         const attribute = data.UserAttributes.find((a) => a.Name === `custom:${CUSTOM_ATTRIBUTE_NAME}`);
//                         resolve((attribute !== undefined && attribute.Value !== undefined) ? JSON.parse(attribute.Value) : []);
//                     }
//                 }
//             });
//     });
// }
