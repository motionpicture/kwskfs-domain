/**
 * 企業作成サンプル
 * @ignore
 */

const kwskfs = require('../');

async function main() {
    await kwskfs.mongoose.connect(process.env.MONGOLAB_URI);

    const organizationRepo = new kwskfs.repository.Organization(kwskfs.mongoose.connection);

    const corporation = kwskfs.factory.organization.corporation.create({
        identifier: kwskfs.factory.organizationIdentifier.corporation.SasakiKogyo,
        name: {
            ja: '佐々木興業株式会社',
            en: 'Cinema Sunshine Co., Ltd.'
        },
        legalName: {
            ja: '佐々木興業株式会社',
            en: 'Cinema Sunshine Co., Ltd.'
        }
    });
    await organizationRepo.organizationModel.findOneAndUpdate(
        {
            identifier: corporation.identifier,
            typeOf: kwskfs.factory.organizationType.Corporation
        },
        corporation,
        { upsert: true }
    ).exec();

    await kwskfs.mongoose.disconnect();
}

main().then(() => {
    console.log('success!');
}).catch((err) => {
    console.error(err);
    process.exit(1);
});
