const AWS = require('aws-sdk');

async function main(
    accessKeyId,
    secretAccessKey,
    userPoolId,
    username
) {
    return new Promise((resolve, reject) => {
        const cognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider({
            apiVersion: 'latest',
            region: 'ap-northeast-1',
            accessKeyId: accessKeyId,
            secretAccessKey: secretAccessKey
        });

        cognitoIdentityServiceProvider.adminGetUser(
            {
                Username: username,
                UserPoolId: userPoolId
            },
            (err, data) => {
                console.log('adminGetUser result:', err, data);
                if (err instanceof Error) {
                    reject(err);
                } else {
                    if (data.UserAttributes === undefined) {
                        reject(new Error('Unexpected.'));
                    } else {
                        resolve(data.UserAttributes);
                    }
                }
            });
    });
}

main(process.env.AWS_ACCESS_KEY_ID, process.env.AWS_SECRET_ACCESS_KEY, process.env.COGNITO_USER_POOL_ID, 'ilovegadd').then().catch(console.error);
