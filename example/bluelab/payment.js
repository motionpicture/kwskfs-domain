const request = require('request-promise-native');
const util = require('util');

const accessToken = 'ilovegadd';
const order = require('./order.json');

async function main() {
    const response = await request.post({
        url: `${process.env.BLUELAB_API_ENDPOINT}/dev/payment/purchase`,
        headers: {
            bluelabToken: accessToken,
            'x-api-key': process.env.BLUELAB_API_KEY
        },
        // auth: { bearer: accessToken },
        body: {
            paymentAmount: 550,
            paymentMethodID: '1011000',
            beneficiaryAccountInformation: {
                branchNumber: '110',
                accountNumber: '1311300',
                accountName: 'ﾌｼﾞﾂｳｽﾀｼﾞｱﾑﾊﾞｲﾃﾝ'
            },
            paymentDetailsList: order
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