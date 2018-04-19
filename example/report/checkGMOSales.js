/**
 * GMO売上健康診断
 * @ignore
 */

const moment = require('moment');
const kwskfs = require('../../');

async function main() {
    await kwskfs.mongoose.connect(process.env.MONGOLAB_URI);

    await kwskfs.service.report.health.checkGMOSales({
        madeFrom: moment().add(-1, 'day').toDate(),
        madeThrough: moment().toDate()
    })(
        new kwskfs.repository.GMONotification(kwskfs.mongoose.connection),
        new kwskfs.repository.Action(kwskfs.mongoose.connection),
    );

    await kwskfs.mongoose.disconnect();
}

main().then(() => {
    console.log('success!');
}).catch((err) => {
    console.error(err);
    process.exit(1);
});
