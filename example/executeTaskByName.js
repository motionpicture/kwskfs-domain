/**
 * タスク名でタスクを実行するサンプル
 * @ignore
 */

const kwskfs = require('../');

async function main() {
    await kwskfs.mongoose.connect(process.env.MONGOLAB_URI);

    await kwskfs.service.task.executeByName(kwskfs.factory.taskName.PayCreditCard)({
        taskRepo: new kwskfs.repository.Task(kwskfs.mongoose.connection),
        connection: kwskfs.mongoose.connection
    });

    await kwskfs.mongoose.disconnect();
}

main().then(() => {
    console.log('success!');
}).catch((err) => {
    console.error(err);
    process.exit(1);
});
