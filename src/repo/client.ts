import * as factory from '@motionpicture/kwskfs-factory';
import * as mongoose from 'mongoose';

import ClientEventModel from './mongoose/model/clientEvent';

/**
 * アプリケーションクライアントリポジトリー
 */
export class MongoRepository {
    public readonly clientEventModel: typeof ClientEventModel;

    constructor(connection: mongoose.Connection) {
        this.clientEventModel = connection.model(ClientEventModel.modelName);
    }

    public async pushEvent(clientAttributes: factory.clientEvent.IAttributes): Promise<factory.clientEvent.IClientEvent> {
        // ドキュメント作成(idが既に存在していればユニーク制約ではじかれる)
        return this.clientEventModel.create(clientAttributes).then((doc) => <factory.clientEvent.IClientEvent>doc.toObject());
    }
}
