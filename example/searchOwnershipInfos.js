/**
 * 所有権を検索するサンプル
 * @ignore
 */

const moment = require('moment');
const kwskfs = require('../');

async function main() {
    await kwskfs.mongoose.connect(process.env.MONGOLAB_URI);

    const ownershipInfoRepo = new kwskfs.repository.OwnershipInfo(kwskfs.mongoose.connection);
    const ownershipInfos = await ownershipInfoRepo.search({
        goodType: kwskfs.factory.reservationType.EventReservation,
        typeOfGood: {
            eventReservationFor: {
                typeOf: kwskfs.factory.eventType.FoodEvent,
                identifier: 'FoodEvent-pearlbowl-40th-frontiers-seagulls'
            }
        },
        ownedBy: '111df186-2458-4b4c-9de7-c71081a94da8'
    });
    console.log(ownershipInfos.length, 'ownershipInfos found.');

    await kwskfs.mongoose.disconnect();
}

main().then(() => {
    console.log('success!');
}).catch((error) => {
    console.error(error);
    process.exit(1);
});
