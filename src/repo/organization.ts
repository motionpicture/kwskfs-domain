import * as factory from '@motionpicture/kwskfs-factory';
import * as createDebug from 'debug';
import { Connection } from 'mongoose';
import organizationModel from './mongoose/model/organization';

const debug = createDebug('kwskfs-domain:repository:organization');

export type IOrganization<T> =
    T extends factory.organizationType.Restaurant ? factory.organization.restaurant.IOrganization :
    factory.organization.IOrganization;

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
    public async findById(
        id: string
    ): Promise<factory.organization.IOrganization> {
        const doc = await this.organizationModel.findOne({
            _id: id
        }).exec();

        if (doc === null) {
            throw new factory.errors.NotFound('organization');
        }

        return doc.toObject();
    }

    /**
     * 組織検索
     */
    public async search<T extends factory.organizationType>(searchConditions: {
        typeOf: T;
        identifiers: string[];
        limit: number;
    }): Promise<IOrganization<T>[]> {
        // 検索条件を作成
        const conditions: any = {
            typeOf: searchConditions.typeOf
        };
        debug('searchConditions:', searchConditions);

        // todo 検索条件を指定できるように改修
        if (Array.isArray(searchConditions.identifiers) && searchConditions.identifiers.length > 0) {
            conditions.identifier = { $in: searchConditions.identifiers };
        }

        // GMOのセキュアな情報を公開しないように注意
        return this.organizationModel.find(
            conditions,
            {
                'gmoInfo.shopPass': 0
            }
        )
            .setOptions({ maxTimeMS: 10000 })
            .limit(searchConditions.limit)
            .exec()
            .then((docs) => docs.map((doc) => doc.toObject()));
    }
}
