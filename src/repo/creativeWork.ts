// import * as factory from '@motionpicture/kwskfs-factory';
import { Connection } from 'mongoose';
import creativeWorkModel from './mongoose/model/creativeWork';

/**
 * 作品抽象リポジトリー
 */
// tslint:disable-next-line:no-unnecessary-class
export abstract class Repository {
    // public abstract async saveMovie(movie: factory.creativeWork.movie.ICreativeWork): Promise<void>;
}

/**
 * 作品リポジトリー
 */
export class MongoRepository implements Repository {
    public readonly creativeWorkModel: typeof creativeWorkModel;

    constructor(connection: Connection) {
        this.creativeWorkModel = connection.model(creativeWorkModel.modelName);
    }
}
