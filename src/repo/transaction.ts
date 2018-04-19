import * as factory from '@motionpicture/kwskfs-factory';
import * as moment from 'moment';
import { Connection } from 'mongoose';

import TransactionModel from './mongoose/model/transaction';

export type ITransactionAttributes =
    factory.transaction.placeOrder.IAttributes |
    factory.transaction.returnOrder.IAttributes;

export type ITransaction =
    factory.transaction.placeOrder.ITransaction |
    factory.transaction.returnOrder.ITransaction;

/**
 * 取引リポジトリー
 */
export class MongoRepository {
    public readonly transactionModel: typeof TransactionModel;

    constructor(connection: Connection) {
        this.transactionModel = connection.model(TransactionModel.modelName);
    }

    /**
     * 取引を開始する
     * @param transactionAttributes 取引属性
     */
    public async start<T extends ITransaction>(
        transactionAttributes: ITransactionAttributes
    ): Promise<T> {
        return this.transactionModel.create(transactionAttributes).then(
            (doc) => <T>doc.toObject()
        );
    }

    /**
     * find placeOrder transaction by id
     * @param transactionId transaction id
     */
    public async findPlaceOrderById(transactionId: string): Promise<factory.transaction.placeOrder.ITransaction> {
        const doc = await this.transactionModel.findOne({
            _id: transactionId,
            typeOf: factory.transactionType.PlaceOrder
        }).exec();

        if (doc === null) {
            throw new factory.errors.NotFound('transaction');
        }

        return <factory.transaction.placeOrder.ITransaction>doc.toObject();
    }

    /**
     * 進行中の取引を取得する
     */
    public async findPlaceOrderInProgressById(transactionId: string): Promise<factory.transaction.placeOrder.ITransaction> {
        const doc = await this.transactionModel.findOne({
            _id: transactionId,
            typeOf: factory.transactionType.PlaceOrder,
            status: factory.transactionStatusType.InProgress
        }).exec();

        if (doc === null) {
            throw new factory.errors.NotFound('transaction in progress');
        }

        return <factory.transaction.placeOrder.ITransaction>doc.toObject();
    }

    /**
     * 取引中の所有者プロフィールを変更する
     * 匿名所有者として開始した場合のみ想定(匿名か会員に変更可能)
     */
    public async setCustomerContactOnPlaceOrderInProgress(
        transactionId: string,
        contact: factory.transaction.placeOrder.ICustomerContact
    ): Promise<void> {
        const doc = await this.transactionModel.findOneAndUpdate(
            {
                _id: transactionId,
                typeOf: factory.transactionType.PlaceOrder,
                status: factory.transactionStatusType.InProgress
            },
            {
                'object.customerContact': contact
            }
        ).exec();

        if (doc === null) {
            throw new factory.errors.NotFound('transaction in progress');
        }
    }

    /**
     * 注文取引を確定する
     * @param transactionId transaction id
     * @param authorizeActions authorize actions
     * @param result transaction result
     */
    public async confirmPlaceOrder(
        transactionId: string,
        authorizeActions: factory.action.authorize.IAction<factory.action.authorize.IAttributes<any, any>>[],
        result: factory.transaction.placeOrder.IResult,
        potentialActions: factory.transaction.placeOrder.IPotentialActions
    ): Promise<factory.transaction.placeOrder.ITransaction> {
        const doc = await this.transactionModel.findOneAndUpdate(
            {
                _id: transactionId,
                typeOf: factory.transactionType.PlaceOrder,
                status: factory.transactionStatusType.InProgress
            },
            {
                status: factory.transactionStatusType.Confirmed, // ステータス変更
                endDate: new Date(),
                'object.authorizeActions': authorizeActions, // 認可アクションリストを更新
                result: result, // resultを更新
                potentialActions: potentialActions // resultを更新
            },
            { new: true }
        ).exec();

        if (doc === null) {
            throw new factory.errors.NotFound('transaction in progress');
        }

        return <factory.transaction.placeOrder.ITransaction>doc.toObject();
    }

    /**
     * 進行中の返品取引を取得する
     */
    public async findReturnOrderInProgressById(transactionId: string): Promise<factory.transaction.returnOrder.ITransaction> {
        const doc = await this.transactionModel.findOne({
            _id: transactionId,
            typeOf: factory.transactionType.ReturnOrder,
            status: factory.transactionStatusType.InProgress
        }).exec();

        if (doc === null) {
            throw new factory.errors.NotFound('transaction in progress');
        }

        return <factory.transaction.returnOrder.ITransaction>doc.toObject();
    }

    /**
     * IDから返品取引を取得する
     * @param transactionId transaction id
     */
    public async findReturnOrderById(transactionId: string): Promise<factory.transaction.returnOrder.ITransaction> {
        const doc = await this.transactionModel.findOne({
            _id: transactionId,
            typeOf: factory.transactionType.ReturnOrder
        }).exec();

        if (doc === null) {
            throw new factory.errors.NotFound('transaction');
        }

        return <factory.transaction.returnOrder.ITransaction>doc.toObject();
    }

    /**
     * 注文返品取引を確定する
     * @param transactionId transaction id
     * @param result transaction result
     */
    public async confirmReturnOrder(
        transactionId: string,
        result: factory.transaction.returnOrder.IResult,
        potentialActions: factory.transaction.returnOrder.IPotentialActions
    ): Promise<factory.transaction.returnOrder.ITransaction> {
        const doc = await this.transactionModel.findOneAndUpdate(
            {
                _id: transactionId,
                typeOf: factory.transactionType.ReturnOrder,
                status: factory.transactionStatusType.InProgress
            },
            {
                status: factory.transactionStatusType.Confirmed, // ステータス変更
                endDate: new Date(),
                result: result,
                potentialActions: potentialActions
            },
            { new: true }
        ).exec();

        if (doc === null) {
            throw new factory.errors.NotFound('transaction in progress');
        }

        return <factory.transaction.returnOrder.ITransaction>doc.toObject();
    }

    /**
     * タスク未エクスポートの取引をひとつ取得してエクスポートを開始する
     * @param typeOf 取引タイプ
     * @param status 取引ステータス
     */
    public async startExportTasks(typeOf: factory.transactionType, status: factory.transactionStatusType):
        Promise<ITransaction | null> {
        return this.transactionModel.findOneAndUpdate(
            {
                typeOf: typeOf,
                status: status,
                tasksExportationStatus: factory.transactionTasksExportationStatus.Unexported
            },
            { tasksExportationStatus: factory.transactionTasksExportationStatus.Exporting },
            { new: true }
        ).exec().then((doc) => (doc === null) ? null : <ITransaction>doc.toObject());
    }

    /**
     * タスクエクスポートリトライ
     * todo updatedAtを基準にしているが、タスクエクスポートトライ日時を持たせた方が安全か？
     */
    public async reexportTasks(intervalInMinutes: number): Promise<void> {
        await this.transactionModel.findOneAndUpdate(
            {
                tasksExportationStatus: factory.transactionTasksExportationStatus.Exporting,
                updatedAt: { $lt: moment().add(-intervalInMinutes, 'minutes').toISOString() }
            },
            {
                tasksExportationStatus: factory.transactionTasksExportationStatus.Unexported
            }
        ).exec();
    }

    /**
     * set task status exported by transaction id
     * IDでタスクをエクスポート済に変更する
     * @param transactionId transaction id
     */
    public async setTasksExportedById(transactionId: string) {
        await this.transactionModel.findByIdAndUpdate(
            transactionId,
            {
                tasksExportationStatus: factory.transactionTasksExportationStatus.Exported,
                tasksExportedAt: moment().toDate()
            }
        ).exec();
    }

    /**
     * 取引を期限切れにする
     */
    public async makeExpired(): Promise<void> {
        const endDate = moment().toDate();

        // ステータスと期限を見て更新
        await this.transactionModel.update(
            {
                status: factory.transactionStatusType.InProgress,
                expires: { $lt: endDate }
            },
            {
                status: factory.transactionStatusType.Expired,
                endDate: endDate
            },
            { multi: true }
        ).exec();
    }

    /**
     * 注文取引を検索する
     * @param conditions 検索条件
     */
    public async searchPlaceOrder(
        conditions: {
            startFrom: Date;
            startThrough: Date;
        }
    ): Promise<factory.transaction.placeOrder.ITransaction[]> {
        return this.transactionModel.find(
            {
                typeOf: factory.transactionType.PlaceOrder,
                startDate: {
                    $gte: conditions.startFrom,
                    $lte: conditions.startThrough
                }
            }
        ).exec()
            .then((docs) => docs.map((doc) => <factory.transaction.placeOrder.ITransaction>doc.toObject()));
    }
}
