// import * as factory from '@motionpicture/kwskfs-factory';
// import * as createDebug from 'debug';
import { Connection } from 'mongoose';
import placeModel from './mongoose/model/place';

// const debug = createDebug('kwskfs-domain:repository:place');

/**
 * 場所抽象リポジトリー
 */
// tslint:disable-next-line:no-unnecessary-class
export abstract class Repository {
}

/**
 * 場所リポジトリー
 */
export class MongoRepository {
    public readonly placeModel: typeof placeModel;

    constructor(connection: Connection) {
        this.placeModel = connection.model(placeModel.modelName);
    }
}
