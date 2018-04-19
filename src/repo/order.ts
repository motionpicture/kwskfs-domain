import * as factory from '@motionpicture/kwskfs-factory';
import { Connection } from 'mongoose';
import OrderModel from './mongoose/model/order';

/**
 * 注文リポジトリー
 */
export class MongoRepository {
    public readonly orderModel: typeof OrderModel;

    constructor(connection: Connection) {
        this.orderModel = connection.model(OrderModel.modelName);
    }

    /**
     * find an order by an inquiry key
     */
    public async findByOrderInquiryKey(orderInquiryKey: factory.order.IOrderInquiryKey) {
        const doc = await this.orderModel.findOne(
            {
                'orderInquiryKey.theaterCode': orderInquiryKey.theaterCode,
                'orderInquiryKey.confirmationNumber': orderInquiryKey.confirmationNumber,
                'orderInquiryKey.telephone': orderInquiryKey.telephone
            }
        ).exec();

        if (doc === null) {
            throw new factory.errors.NotFound('order');
        }

        return <factory.order.IOrder>doc.toObject();
    }

    /**
     * なければ作成する
     * @param order 注文
     */
    public async createIfNotExist(order: factory.order.IOrder) {
        await this.orderModel.findOneAndUpdate(
            { orderNumber: order.orderNumber },
            { $setOnInsert: order },
            { upsert: true }
        ).exec();
    }

    /**
     * 注文ステータスを変更する
     * @param orderNumber 注文番号
     * @param orderStatus 注文ステータス
     */
    public async changeStatus(orderNumber: string, orderStatus: factory.orderStatus) {
        const doc = await this.orderModel.findOneAndUpdate(
            { orderNumber: orderNumber },
            { orderStatus: orderStatus }
        ).exec();

        if (doc === null) {
            throw new factory.errors.NotFound('order');
        }
    }

    /**
     * 注文番号から注文を取得する
     * @param orderNumber 注文番号
     */
    public async findByOrderNumber(orderNumber: string): Promise<factory.order.IOrder> {
        const doc = await this.orderModel.findOne(
            { orderNumber: orderNumber }
        ).exec();

        if (doc === null) {
            throw new factory.errors.NotFound('order');
        }

        return <factory.order.IOrder>doc.toObject();
    }
}
