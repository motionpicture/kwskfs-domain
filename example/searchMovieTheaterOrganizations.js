/**
 * 劇場組織検索サンプル
 * @ignore
 */

const kwskfs = require('../');

async function main() {
    await kwskfs.mongoose.connect(process.env.MONGOLAB_URI);

    const repository = new kwskfs.repository.Organization(kwskfs.mongoose.connection);
    const theaters = await repository.searchMovieTheaters({});
    console.log('theaters:', theaters);

    await kwskfs.mongoose.disconnect();
}

main().then(() => {
    console.log('success!');
}).catch((error) => {
    console.error(error);
    process.exit(1);
});
