/**
 * チケットトークンで所有権を検索するサンプル
 * @ignore
 */

const moment = require('moment');
const kwskfs = require('../');

async function main() {
    await kwskfs.mongoose.connect(process.env.MONGOLAB_URI);

    const ownershipInfoRepo = new kwskfs.repository.OwnershipInfo(kwskfs.mongoose.connection);
    const docs = await ownershipInfoRepo.ownershipInfoModel.find({
        'typeOfGood.reservedTicket.ticketToken': {
            $exists: true,
            $eq: '1182017101100047296001'
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
