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

        cognitoIdentityServiceProvider.adminUpdateUserAttributes(
            {
                Username: username,
                UserPoolId: userPoolId,
                UserAttributes: [
                    {
                        Name: 'custom:bluelabAccountNumber',
                        Value: '1011000'
                    }
                ]
            },
            (err, data) => {
                console.log('adminUpdateUserAttributes result:', err, data);
                if (err instanceof Error) {
                    reject(err);
                } else {
                    resolve();
                }
            });
    });
}

main(process.env.AWS_ACCESS_KEY_ID, process.env.AWS_SECRET_ACCESS_KEY, process.env.COGNITO_USER_POOL_ID, 'ilovegadd').then().catch(console.error);
