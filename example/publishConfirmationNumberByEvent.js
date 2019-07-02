/**
 * イベントで確認番号発行サンプル
 * @ignore
 */

const kwskfs = require('../');

async function main() {
    await kwskfs.mongoose.connect(process.env.MONGOLAB_URI);
    const redisClient = kwskfs.redis.createClient(
        parseInt(process.env.TEST_REDIS_PORT, 10),
        process.env.TEST_REDIS_HOST,
        {
            password: process.env.TEST_REDIS_KEY,
            tls: { servername: process.env.TEST_REDIS_HOST }
        });

    const eventRepo = new kwskfs.repository.Event(kwskfs.mongoose.connection);
    const events = await eventRepo.search({ typeOf: kwskfs.factory.eventType.FoodEvent });
    const event = events[0];

    console.log('publishing...', event.identifier);
    const confirmationNumberRepo = new kwskfs.repository.ConfirmationNumber(redisClient);
    const confirmationNumber = await confirmationNumberRepo.publishByEvent(event);
    console.log('confirmationNumber published.', confirmationNumber);

    await kwskfs.mongoose.disconnect();
    redisClient.quit();
}

main().then(() => {
    console.log('success!');
}).catch((error) => {
    console.error(error);
    process.exit(1);
});
