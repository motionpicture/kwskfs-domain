const AWS = require('aws-sdk');
const fs = require('fs');

async function main(
    accessKeyId,
    secretAccessKey,
    userPoolId
) {
    return new Promise((resolve, reject) => {
        const cognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider({
            apiVersion: 'latest',
            region: 'ap-northeast-1',
            accessKeyId: accessKeyId,
            secretAccessKey: secretAccessKey
        });

        cognitoIdentityServiceProvider.listUsers(
            {
                UserPoolId: userPoolId
                // PaginationToken: 'CAIS7AEIARLFAQgDEsABAB0Ly2dDXnWkYksL0QO1FhzpVJvnFblCx+2sb4ADCfM1eyJAbiI6IlBhZ2luYXRpb25Db250aW51YXRpb25EVE8iLCJuZXh0S2V5IjoiQUFBQUFBQUFCYXVBQVFFQndsekp1Wi9xUTNhMHozOXd4Rng5dGFOMFZzRk5XazBtcktxdnZNY2lHM1JsYm1ZNzQ0R3A0NEtUT3c9PSIsInByZXZpb3VzUmVxdWVzdFRpbWUiOjE1MjY4Nzg3ODczMzZ9GiAg23szT+Jyg7fE1TEYqk2x43WpPrSg7cF2RM9ASWtQ4g=='
            },
            (err, data) => {
                console.log('listUsers result:', err, data);
                if (err instanceof Error) {
                    reject(err);
                } else {
                    // console.log(data.Users.length, 'users found.');
                    // console.log(data.Users[0].Attributes);
                    // console.log(data.PaginationToken);
                    // const users = data.Users.map((u) => {
                    //     const accountNumberAttribute = u.Attributes.find((a) => a.Name === 'custom:pecorinoAccountIds');
                    //     const bluelabAccountNumberAttribute = u.Attributes.find((a) => a.Name === 'custom:bluelabAccountNumber');
                    //     return {
                    //         username: u.Username,
                    //         accountNumber: (accountNumberAttribute !== undefined) ? JSON.parse(accountNumberAttribute.Value)[0] : undefined,
                    //         bluelabAccountNumber: (bluelabAccountNumberAttribute !== undefined) ? bluelabAccountNumberAttribute.Value : undefined
                    //     }
                    // });
                    // fs.writeFileSync(`${__dirname}/users.json`, JSON.stringify(users, null, '    '));
                    resolve(data);
                }
            });
    });
}

main(process.env.AWS_ACCESS_KEY_ID, process.env.AWS_SECRET_ACCESS_KEY, process.env.COGNITO_USER_POOL_ID).then().catch(console.error);
