/**
 * メニューアイテムの在庫状況を保管するサンプル
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

    const organizationRepo = new kwskfs.repository.Organization(kwskfs.mongoose.connection);
    const availabilityRepo = new kwskfs.repository.itemAvailability.Offer(redisClient);

    const restaurants = await organizationRepo.search({
        typeOf: kwskfs.factory.organizationType.Restaurant,
        identifiers: [],
        limit: 100
    });

    await Promise.all(restaurants.map(async (restaurant) => {
        // メニューアイテムリストをマージ
        console.log('merge menu items from restaurants...');
        const menuItems = [];
        restaurant.hasMenu.forEach((menu) => {
            menu.hasMenuSection.forEach((menuSection) => {
                menuItems.push(...menuSection.hasMenuItem);
            });
        });

        await Promise.all(menuItems.map(async (menuItem) => {
            const availabilities = menuItem.offers.reduce(
                (a, b) => {
                    a[b.identifier] = kwskfs.factory.itemAvailability.InStock;

                    return a;
                },
                {}
            );
            console.log('storing...', restaurant.id, menuItem.identifier, availabilities);
            await availabilityRepo.storeByMenuItem(
                restaurant.id,
                menuItem.identifier,
                availabilities,
                600
            );
            console.log('availability stored.');
        }));
    }));

    await Promise.all(restaurants.map(async (restaurant) => {
        // メニューアイテムリストをマージ
        console.log('merge menu items from restaurants...');
        const menuItems = [];
        restaurant.hasMenu.forEach((menu) => {
            menu.hasMenuSection.forEach((menuSection) => {
                menuItems.push(...menuSection.hasMenuItem);
            });
        });

        await Promise.all(menuItems.map(async (menuItem) => {
            const availabilities = await availabilityRepo.findByMenuItem(restaurant.id, menuItem.identifier);
            console.log('availabilities found.', restaurant.id, menuItem.identifier, availabilities);
            console.log(typeof availabilities);
        }));
    }));

    await kwskfs.mongoose.disconnect();
    redisClient.quit();
}

main().then(() => {
    console.log('success!');
}).catch((error) => {
    console.error(error);
    process.exit(1);
});
