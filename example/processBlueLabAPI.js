const request = require('request-promise-native');
const util = require('util');

const accessToken = 'eyJraWQiOiI0eVpocWlFZlFRVEVmSTNERlA1ZjBWQXpwazFLekFBa3RQd2haSGZHdzBzPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiJhZWJhZjU3My05OGMxLTRjZWEtODRiZi1lMjBlYmRjNjg2OWEiLCJ0b2tlbl91c2UiOiJhY2Nlc3MiLCJzY29wZSI6ImF3cy5jb2duaXRvLnNpZ25pbi51c2VyLmFkbWluIiwiYXV0aF90aW1lIjoxNTI0MTIxMzcxLCJpc3MiOiJodHRwczpcL1wvY29nbml0by1pZHAuYXAtbm9ydGhlYXN0LTEuYW1hem9uYXdzLmNvbVwvYXAtbm9ydGhlYXN0LTFfbG5xVWV2aVhqIiwiZXhwIjoxNTI0MTI0OTcxLCJpYXQiOjE1MjQxMjEzNzEsImp0aSI6IjY2YWViODRiLTZhZWMtNDkzNC04ZGM1LTBlNzdiYWE4Y2I3MSIsImNsaWVudF9pZCI6IjJzdWtxYTBvY2w1N2R0cW9zOGEyYnBxaWFjIiwidXNlcm5hbWUiOiJpbG92ZWdhZGQifQ.NX8YmBrDwfYPASOnRAXTv-4beJlUhf2oR-DeMkMuKIVbQUSHeGxc8k4mdXa-BjaPM2YeRXpggK38or0U6YSeBL5lhpWH4RsYBgLx6islTtL83IbGg0pdVY46yii7RVxlnVQmk5_FRtUlU6RM5nRj3kL8x4fs81ON1GTOwHKtpzzfqMo3xqUvdatfB2ehOZPiMXYgFajQa3MALV9Nmu2OXTD7czUJYwvY35nnqd2-qTZDFAqS59VVH9IgNp6k_nPysCc4n0A5_bqfU3Mp5ALJw0hiwSAP6hl3_vqVSXWuTQaLnaI3n2DqnGS4tTYJZlmw6iQcg55oG_tW9SjYYQHv5Q';
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