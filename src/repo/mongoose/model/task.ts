import * as factory from '@motionpicture/kwskfs-factory';
import * as mongoose from 'mongoose';

const safe: any = { j: 1, w: 'majority', wtimeout: 10000 };

const executionResultSchema = new mongoose.Schema(
    {},
    {
        id: false,
        _id: false,
        strict: false
    }
);

const dataSchema = new mongoose.Schema(
    {},
    {
        id: false,
        _id: false,
        strict: false
    }
);

/**
 * タスクスキーマ
 * @ignore
 */
const schema = new mongoose.Schema(
    {
        name: String,
        status: String,
        runsAt: Date,
        remainingNumberOfTries: Number,
        lastTriedAt: Date,
        numberOfTried: Number,
        executionResults: [executionResultSchema],
        data: dataSchema
    },
    {
        collection: 'tasks',
        id: true,
        read: 'primaryPreferred',
        safe: safe,
        strict: true,
        useNestedStrict: true,
        timestamps: {
            createdAt: 'createdAt',
            updatedAt: 'updatedAt'
        },
        toJSON: { getters: true },
        toObject: { getters: true }
    }
);

// 取引のタスク検索に使用
schema.index(
    { 'data.transactionId': 1 },
    {
        partialFilterExpression: {
            'data.transactionId': { $exists: true }
        }
    }
);

// 基本的にグループごとに、ステータスと実行日時を見て、タスクは実行される
schema.index(
    { name: 1, status: 1, numberOfTried: 1, runsAt: 1 }
);

// ステータス&最終トライ日時&残りトライ可能回数を見て、リトライor中止を決定する
schema.index(
    { remainingNumberOfTries: 1, status: 1, lastTriedAt: 1 },
    {
        partialFilterExpression: {
            lastTriedAt: { $type: 'date' }
        }
    }
);

// 測定データ作成時に使用
schema.index({ status: 1, runsAt: 1 });
schema.index({ name: 1, createdAt: 1 });
schema.index(
    { status: 1, name: 1, lastTriedAt: 1 },
    {
        partialFilterExpression: {
            lastTriedAt: { $type: 'date' }
        }
    }
);

// 特定のEメールメッセージタスク検索に使用
// ひとつの注文取引に対する購入完了メールはユニークなはず
schema.index(
    { 'data.actionAttributes.object.identifier': 1, name: 1 },
    {
        unique: true,
        partialFilterExpression: {
            name: factory.taskName.SendEmailMessage,
            'data.actionAttributes.object.identifier': { $exists: true }
        }
    }
);

export default mongoose.model('Task', schema).on(
    'index',
    // tslint:disable-next-line:no-single-line-block-comment
    /* istanbul ignore next */
    (error) => {
        if (error !== undefined) {
            console.error(error);
        }
    }
);
