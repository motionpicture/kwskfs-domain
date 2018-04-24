/**
 * 注文検索サンプル
 * @ignore
 */

const moment = require('moment');
const kwskfs = require('../');

async function main() {
    await kwskfs.mongoose.connect(process.env.MONGOLAB_URI);

    const orderRepo = new kwskfs.repository.Order(kwskfs.mongoose.connection);
    const orders = await orderRepo.search({
        sellerId: '5adae69ff36d2843be76a1e5',
        // customerId: '111df186-2458-4b4c-9de7-c71081a94da8',
        // orderNumber: '3940-997286-8877',
        orderStatus: kwskfs.factory.orderStatus.OrderDelivered
    });
    console.log(orders.length, 'orders found.');

    await kwskfs.mongoose.disconnect();
}

main().then(() => {
    console.log('success!');
}).catch((error) => {
    console.error(error);
    process.exit(1);
});
