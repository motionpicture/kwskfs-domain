/**
 * イベント検索サンプル
 * @ignore
 */

const kwskfs = require('../');

async function main() {
    await kwskfs.mongoose.connect(process.env.MONGOLAB_URI);

    const repository = new kwskfs.repository.Event(kwskfs.mongoose.connection);
    const events = await repository.search({
        typeOf: kwskfs.factory.eventType.FoodEvent,
        identifiers: [],
        limit: 100
    });
    console.log(events.length, 'events found.')

    await kwskfs.mongoose.disconnect();
}

main().then(() => {
    console.log('success!');
}).catch((error) => {
    console.error(error);
    process.exit(1);
});
