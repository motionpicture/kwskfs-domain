/**
 * LINEユーザーIDで注文検索するサンプル
 * @ignore
 */

const moment = require('moment');
const kwskfs = require('../');

async function main() {
    await kwskfs.mongoose.connect(process.env.MONGOLAB_URI);

    const orderRepo = new kwskfs.repository.Order(kwskfs.mongoose.connection);
    const docs = await orderRepo.orderModel.find({
        orderDate: { $gt: moment().add(-1, 'month').toDate() },
        'customer.memberOf.membershipNumber': {
            $exists: true,
            $eq: 'U28fba84b4008d60291fc861e2562b34f'
        },
        'customer.memberOf.programName': {
            $exists: true,
            $eq: 'LINE'
        }
    }).exec();
    console.log('docs:', docs);

    await kwskfs.mongoose.disconnect();
}

main().then(() => {
    console.log('success!');
}).catch((error) => {
    console.error(error);
    process.exit(1);
});
