import * as factory from '@motionpicture/kwskfs-factory';
import * as mongoose from 'mongoose';

const safe: any = { j: 1, w: 'majority', wtimeout: 10000 };

const agentSchema = new mongoose.Schema(
    {},
    {
        id: false,
        _id: false,
        strict: false
    }
);

const recipientSchema = new mongoose.Schema(
    {},
    {
        id: false,
        _id: false,
        strict: false
    }
);

const resultSchema = new mongoose.Schema(
    {},
    {
        id: false,
        _id: false,
        strict: false
    }
);

const errorSchema = new mongoose.Schema(
    {},
    {
        id: false,
        _id: false,
        strict: false
    }
);

const objectSchema = new mongoose.Schema(
    {},
    {
        id: false,
        _id: false,
        strict: false
    }
);

const purposeSchema = new mongoose.Schema(
    {},
    {
        id: false,
        _id: false,
        strict: false
    }
);

const potentialActionsSchema = new mongoose.Schema(
    {},
    {
        id: false,
        _id: false,
        strict: false
    }
);

/**
 * アクションスキーマ
 * @ignore
 */
const schema = new mongoose.Schema(
    {
        actionStatus: String,
        typeOf: String,
        agent: agentSchema,
        recipient: recipientSchema,
        result: resultSchema,
        error: errorSchema,
        object: objectSchema,
        startDate: Date,
        endDate: Date,
        purpose: purposeSchema,
        potentialActions: potentialActionsSchema
    },
    {
        collection: 'actions',
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

schema.index(
    { typeOf: 1, _id: 1 }
);

// 取引の承認アクション検索に使用
schema.index(
    { typeOf: 1, 'purpose.id': 1 },
    {
        partialFilterExpression: {
            'purpose.id': { $exists: true }
        }
    }
);

// 取引の承認アクション状態変更に使用
schema.index(
    { 'object.typeOf': 1, 'purpose.id': 1, typeOf: 1, _id: 1 },
    {
        partialFilterExpression: {
            'object.typeOf': { $exists: true },
            'purpose.id': { $exists: true }
        }
    }
);

// 注文に対するアクション検索に使用
schema.index(
    { 'object.orderNumber': 1 },
    {
        partialFilterExpression: {
            'object.orderNumber': { $exists: true }
        }
    }
);
schema.index(
    { 'purpose.orderNumber': 1 },
    {
        partialFilterExpression: {
            'purpose.orderNumber': { $exists: true }
        }
    }
);

// 決済IDに相当するものから支払アクションを検索する際に使用
schema.index(
    { 'object.paymentMethod.paymentMethodId': 1 },
    {
        partialFilterExpression: {
            typeOf: factory.actionType.PayAction,
            'object.paymentMethod.paymentMethodId': { $exists: true }
        }
    }
);

// Pecorino取引IDから承認アクションを検索する際に使用
schema.index(
    { 'result.pecorinoTransaction.id': 1 },
    {
        name: 'searchAuthorizeActionByPecorinoTransactionId',
        partialFilterExpression: {
            typeOf: factory.actionType.AuthorizeAction,
            'result.pecorinoTransaction.id': { $exists: true }
        }
    }
);

// 取引調査や、アクション集計などで、アクションを検索することはとても多いので、そのためのインデックス
schema.index(
    { typeOf: 1, 'object.typeOf': 1, startDate: 1 }
);

export default mongoose.model('Action', schema).on(
    'index',
    // tslint:disable-next-line:no-single-line-block-comment
    /* istanbul ignore next */
    (error) => {
        if (error !== undefined) {
            console.error(error);
        }
    }
);
