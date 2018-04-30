const request = require('request-promise-native');
const util = require('util');

const accessToken = 'ilovegadd';

async function main() {
    const response = await request.post({
        url: `${process.env.BLUELAB_API_ENDPOINT}/dev/accountRegistration`,
        headers: {
            bluelabToken: accessToken,
            'x-api-key': process.env.BLUELAB_API_KEY
        },
        body: {
            paymentInformation: {
                paymentMethod: 'bankAPI(mizuho)',
                paymentInstitute: 'mizuhoBank',
                accountInformation: {
                    branchNumber: '015',
                    accountNumber: '1011000',
                    accountName: 'ﾂｷｼﾞﾀﾛｳ'
                }
            }
        },
        json: true,
        simple: false,
        resolveWithFullResponse: true
    });
    console.log('response:', response);
    console.log('statusCode:', response.statusCode);
    console.log('response body:', response.body);
    // console.log(util.inspect(response.body, { showHidden: true, depth: null }));
}

main().then(() => {
    console.log('success!');
}).catch(console.error)