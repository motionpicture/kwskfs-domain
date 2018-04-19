/**
 * 劇場ショップオープンサンプル
 * @ignore
 */

const kwskfs = require('../');

async function main() {
    await kwskfs.mongoose.connect(process.env.MONGOLAB_URI);
    
    const organizationRepo = new kwskfs.repository.Organization(kwskfs.mongoose.connection);

    const movieTheaters = [
        kwskfs.factory.organization.movieTheater.create({
            name: {
                en: 'CinemasunshineTest118',
                ja: 'シネマサンシャイン１１８'
            },
            branchCode: '118',
            gmoInfo: {
                shopPass: 'xbxmkaa6',
                shopId: 'tshop00026096',
                siteId: 'tsite00022126'
            },
            parentOrganization: {
                typeOf: kwskfs.factory.organizationType.Corporation,
                identifier: kwskfs.factory.organizationIdentifier.corporation.SasakiKogyo,
                name: {
                    en: 'Cinema Sunshine Co., Ltd.',
                    ja: '佐々木興業株式会社'
                }
            },
            location: {
                typeOf: 'MovieTheater',
                branchCode: '118',
                name: {
                    en: 'CinemasunshineTest118',
                    ja: 'シネマサンシャイン１１８'
                }
            },
            // tslint:disable-next-line:no-http-string
            url: 'http://testkwskfsportal.azurewebsites.net/theater/aira/'
        }),
        kwskfs.factory.organization.movieTheater.create({
            name: {
                en: 'CinemasunshineTest11２',
                ja: 'シネマサンシャイン北島テスト'
            },
            branchCode: '112',
            gmoInfo: {
                shopPass: 'xbxmkaa6',
                shopId: 'tshop00026096',
                siteId: 'tsite00022126'
            },
            parentOrganization: {
                typeOf: kwskfs.factory.organizationType.Corporation,
                identifier: kwskfs.factory.organizationIdentifier.corporation.SasakiKogyo,
                name: {
                    en: 'Cinema Sunshine Co., Ltd.',
                    ja: '佐々木興業株式会社'
                }
            },
            location: {
                typeOf: 'MovieTheater',
                branchCode: '112',
                name: {
                    en: 'CinemasunshineTest11２',
                    ja: 'シネマサンシャイン北島テスト'
                }
            },
            // tslint:disable-next-line:no-http-string
            url: 'http://testkwskfsportal.azurewebsites.net/theater/kitajima/'
        }),
    ];

    await Promise.all(movieTheaters.map(async (movieTheater) => {
        await organizationRepo.openMovieTheaterShop(movieTheater);
    }));

    await kwskfs.mongoose.disconnect();
}

main().then(() => {
    console.log('success!');
}).catch((err) => {
    console.error(err);
    process.exit(1);
});
