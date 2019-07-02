/**
 * 取引タスクエクスポートサンプル
 * @ignore
 */

const kwskfs = require('../');

async function main() {
    await kwskfs.mongoose.connect(process.env.MONGOLAB_URI);

    await kwskfs.service.transaction.placeOrder.exportTasks(kwskfs.factory.transactionStatusType.Confirmed)({
        task: new kwskfs.repository.Task(kwskfs.mongoose.connection),
        transaction: new kwskfs.repository.Transaction(kwskfs.mongoose.connection)
    });

    await kwskfs.mongoose.disconnect();
}

main().then(() => {
    console.log('success!');
}).catch((err) => {
    console.error(err);
    process.exit(1);
});
