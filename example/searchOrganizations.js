/**
 * 組織検索サンプル
 * @ignore
 */

const kwskfs = require('../');

async function main() {
    await kwskfs.mongoose.connect(process.env.MONGOLAB_URI);

    const repository = new kwskfs.repository.Organization(kwskfs.mongoose.connection);
    const organizations = await repository.search({
        typeOf: kwskfs.factory.organizationType.Restaurant,
        identifiers: [],
        limit: 100
    });
    console.log('organizations found.', organizations);

    await kwskfs.mongoose.disconnect();
}

main().then(() => {
    console.log('success!');
}).catch((error) => {
    console.error(error);
    process.exit(1);
});
