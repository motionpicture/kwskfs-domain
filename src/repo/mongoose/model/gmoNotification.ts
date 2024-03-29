import * as mongoose from 'mongoose';

const safe: any = { j: 1, w: 'majority', wtimeout: 10000 };

/**
 * GMO通知スキーマ
 * @ignore
 */
const schema = new mongoose.Schema(
    {
        shopId: String, // ショップID
        shopPass: String, // ショップパスワード
        accessId: String, // 取引ID
        accessPass: String, // 取引パスワード
        orderId: String, // オーダーID
        status: String, // 現状態
        jobCd: String, // 処理区分
        amount: Number, // 利用金額
        tax: Number, // 税送料
        currency: String, // 通貨コード
        forward: String, // 仕向先会社コード
        method: String, // 支払方法
        payTimes: String, // 支払回数
        tranId: String, // トランザクションID
        approve: String, // 承認番号
        tranDate: String, // 処理日付
        errCode: String, // エラーコード
        errInfo: String, // エラー詳細コード
        payType: String // 決済方法
    },
    {
        collection: 'gmoNotifications',
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

// GMO売上健康診断時に使用
schema.index({ jobCd: 1, tranDate: 1 });

export default mongoose.model('GMONotification', schema).on(
    'index',
    // tslint:disable-next-line:no-single-line-block-comment
    /* istanbul ignore next */
    (error) => {
        if (error !== undefined) {
            console.error(error);
        }
    }
);
