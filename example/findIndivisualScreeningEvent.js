/**
 * 個々の上映イベント取得
 *
 * @ignore
 */

const kwskfs = require('../');

async function main() {
    await kwskfs.mongoose.connect(process.env.MONGOLAB_URI);

    const event = await kwskfs.service.offer.findIndividualScreeningEventByIdentifier('11816221020170720301300')({
        event: new kwskfs.repository.Event(kwskfs.mongoose.connection)
    });
    console.log('event:', event);

    await kwskfs.mongoose.disconnect();
}

main().then(() => {
    console.log('success!');
}).catch((err) => {
    console.error(err);
    process.exit(1);
});
