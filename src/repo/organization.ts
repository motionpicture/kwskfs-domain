import * as factory from '@motionpicture/kwskfs-factory';
import * as createDebug from 'debug';
import { Connection } from 'mongoose';
import organizationModel from './mongoose/model/organization';

const debug = createDebug('kwskfs-domain:repository:organization');

/**
 * 組織リポジトリー
 */
export class MongoRepository {
    public readonly organizationModel: typeof organizationModel;

    constructor(connection: Connection) {
        this.organizationModel = connection.model(organizationModel.modelName);
    }

    /**
     * find a movie theater by id
     * IDで劇場組織を取得する
     * @param id organization id
     */
    public async findMovieTheaterById(
        id: string
    ): Promise<factory.organization.movieTheater.IOrganization> {
        const doc = await this.organizationModel.findOne({
            _id: id,
            typeOf: factory.organizationType.MovieTheater
        }).exec();

        if (doc === null) {
            throw new factory.errors.NotFound('movieTheater');
        }

        return <factory.organization.movieTheater.IOrganization>doc.toObject();
    }

    /**
     * save a movie theater
     * 劇場を保管する
     * @param movieTheater movieTheater object
     */
    public async openMovieTheaterShop(movieTheater: factory.organization.movieTheater.IOrganization) {
        await this.organizationModel.findOneAndUpdate(
            {
                identifier: movieTheater.identifier,
                typeOf: factory.organizationType.MovieTheater
            },
            movieTheater,
            { upsert: true }
        ).exec();
    }

    /**
     * 劇場検索
     */
    public async searchMovieTheaters(
        searchConditions: {}
    ): Promise<factory.organization.movieTheater.IPublicFields[]> {
        // 検索条件を作成
        const conditions: any = {
            typeOf: factory.organizationType.MovieTheater
        };
        debug('searchConditions:', searchConditions);

        // todo 検索条件を指定できるように改修

        debug('searching movie theaters...', conditions);

        // GMOのセキュアな情報を公開しないように注意
        return <factory.organization.movieTheater.IPublicFields[]>await this.organizationModel.find(
            conditions,
            'identifier name legalName typeOf location url branchCode parentOrganization gmoInfo.shopId'
        )
            .setOptions({ maxTimeMS: 10000 })
            .exec()
            .then((docs) => docs.map((doc) => doc.toObject()));
    }

    /**
     * 枝番号で劇場検索
     */
    public async findMovieTheaterByBranchCode(
        branchCode: string
    ): Promise<factory.organization.movieTheater.IPublicFields> {
        const doc = await this.organizationModel.findOne(
            {
                typeOf: factory.organizationType.MovieTheater,
                'location.branchCode': branchCode
            },
            'identifier name legalName typeOf location url branchCode parentOrganization gmoInfo.shopId'
        ).exec();

        if (doc === null) {
            throw new factory.errors.NotFound('movieTheater');
        }

        return <factory.organization.movieTheater.IPublicFields>doc.toObject();
    }
}
