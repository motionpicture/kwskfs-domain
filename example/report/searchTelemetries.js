/**
 * 測定データ検索サンプル
 * @ignore
 */

const moment = require('moment');
const kwskfs = require('../../');

async function main() {
    await kwskfs.mongoose.connect(process.env.MONGOLAB_URI);

    const telemetries = await kwskfs.service.report.searchTelemetries({
        measuredFrom: moment('2017-11-02T15:42:00Z').toDate(),
        measuredThrough: moment('2017-12-02T15:42:00Z').toDate(),
        scope: kwskfs.service.report.TelemetryScope.Seller
    })(
        new kwskfs.repository.Telemetry(kwskfs.mongoose.connection),
    );
    console.log(telemetries);
    console.log(telemetries[0].object.measuredAt instanceof Date);
    console.log(telemetries[0].result.stock.measuredAt instanceof Date);
    console.log(telemetries[0].result.flow.measuredFrom instanceof Date);

    await kwskfs.mongoose.disconnect();
}

main().then(() => {
    console.log('success!');
}).catch((err) => {
    console.error(err);
    process.exit(1);
});
