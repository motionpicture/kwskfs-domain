/**
 * 測定データ作成サンプル
 * @ignore
 */

const moment = require('moment');
const kwskfs = require('../../');

async function main() {
    await kwskfs.mongoose.connect(process.env.MONGOLAB_URI);

    await kwskfs.service.report.createTelemetry({
        measuredAt: moment('2017-11-26T13:37:00Z').toDate(),
        sellerId: '59d20831e53ebc2b4e774466'
    })(
        new kwskfs.repository.Task(kwskfs.mongoose.connection),
        new kwskfs.repository.Telemetry(kwskfs.mongoose.connection),
        new kwskfs.repository.Transaction(kwskfs.mongoose.connection),
        new kwskfs.repository.action.Authorize(kwskfs.mongoose.connection)
    );

    await kwskfs.mongoose.disconnect();
}

main().then(() => {
    console.log('success!');
}).catch((err) => {
    console.error(err);
    process.exit(1);
});
