/**
 * 取引CSVダウンロードサンプル
 * @ignore
 */

const moment = require('moment');
const kwskfs = require('../../');

async function main() {
    await kwskfs.mongoose.connect(process.env.MONGOLAB_URI);

    const csv = await kwskfs.service.transaction.placeOrder.download(
        {
            startFrom: moment().add(-1, 'day').toDate(),
            startThrough: moment().toDate()
        },
        'csv'
    )({
        action: new kwskfs.repository.Action(kwskfs.mongoose.connection),
        ownershipInfo: new kwskfs.repository.OwnershipInfo(kwskfs.mongoose.connection),
        order: new kwskfs.repository.Order(kwskfs.mongoose.connection),
        transaction: new kwskfs.repository.Transaction(kwskfs.mongoose.connection)
    });
    console.log(csv);

    await kwskfs.mongoose.disconnect();
}

main().then(() => {
    console.log('success!');
}).catch((err) => {
    console.error(err);
    process.exit(1);
});
