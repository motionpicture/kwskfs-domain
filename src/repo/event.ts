
import * as factory from '@motionpicture/kwskfs-factory';
// import * as moment from 'moment';
import { Connection } from 'mongoose';
import eventModel from './mongoose/model/event';

/**
 * イベント抽象リポジトリー
 */
export abstract class Repository {
    // public abstract async saveScreeningEvent(screeningEvent: factory.event.screeningEvent.IEvent): Promise<void>;
    // public abstract async saveIndividualScreeningEvent(
    //     individualScreeningEvent: factory.event.individualScreeningEvent.IEvent
    // ): Promise<void>;
    // public abstract async cancelIndividualScreeningEvent(identifier: string): Promise<void>;
    // public abstract async searchIndividualScreeningEvents(
    //     searchConditions: factory.event.individualScreeningEvent.ISearchConditions
    // ): Promise<factory.event.individualScreeningEvent.IEvent[]>;
    public abstract async findByIdentifier(
        typeOf: factory.eventType,
        identifier: string
    ): Promise<factory.event.IEvent>;
}

/**
 * イベントリポジトリー
 */
export class MongoRepository implements Repository {
    public readonly eventModel: typeof eventModel;

    constructor(connection: Connection) {
        this.eventModel = connection.model(eventModel.modelName);
    }

    /**
     * 上映イベントをキャンセルする
     * @param identifier イベント識別子
     */
    // public async cancelIndividualScreeningEvent(identifier: string) {
    //     await this.eventModel.findOneAndUpdate(
    //         {
    //             identifier: identifier,
    //             typeOf: factory.eventType.IndividualScreeningEvent
    //         },
    //         { eventStatus: factory.eventStatusType.EventCancelled },
    //         { new: true }
    //     ).exec();
    // }

    /**
     * 個々の上映イベントを検索する
     * @param searchConditions 検索条件
     */
    // public async searchIndividualScreeningEvents(
    //     searchConditions: factory.event.individualScreeningEvent.ISearchConditions
    // ): Promise<factory.event.individualScreeningEvent.IEvent[]> {
    //     // dayプロパティがあればstartFrom & startThroughに変換(互換性維持のため)
    //     // tslint:disable-next-line:no-single-line-block-comment
    //     /* istanbul ignore else */
    //     if ((<any>searchConditions).day !== undefined) {
    //         searchConditions.startFrom = moment(`${(<any>searchConditions).day} +09:00`, 'YYYYMMDD Z').toDate();
    //         searchConditions.startThrough = moment(`${(<any>searchConditions).day} +09:00`, 'YYYYMMDD Z').add(1, 'day').toDate();
    //     }

    //     // MongoDB検索条件
    //     const andConditions: any[] = [
    //         {
    //             typeOf: factory.eventType.IndividualScreeningEvent
    //         }
    //     ];

    //     // theaterプロパティがあればbranchCodeで検索(互換性維持のため)
    //     // tslint:disable-next-line:no-single-line-block-comment
    //     /* istanbul ignore else */
    //     if ((<any>searchConditions).theater !== undefined) {
    //         andConditions.push({
    //             'superEvent.location.branchCode': {
    //                 $exists: true,
    //                 $eq: (<any>searchConditions).theater
    //             }
    //         });
    //     }

    //     // 場所の識別子条件
    //     // tslint:disable-next-line:no-single-line-block-comment
    //     /* istanbul ignore else */
    //     if (Array.isArray(searchConditions.superEventLocationIdentifiers)) {
    //         andConditions.push({
    //             'superEvent.location.identifier': {
    //                 $exists: true,
    //                 $in: searchConditions.superEventLocationIdentifiers
    //             }
    //         });
    //     }

    //     // イベントステータス条件
    //     // tslint:disable-next-line:no-single-line-block-comment
    //     /* istanbul ignore else */
    //     if (Array.isArray(searchConditions.eventStatuses)) {
    //         andConditions.push({
    //             eventStatus: { $in: searchConditions.eventStatuses }
    //         });
    //     }

    //     // 作品識別子条件
    //     // tslint:disable-next-line:no-single-line-block-comment
    //     /* istanbul ignore else */
    //     if (Array.isArray(searchConditions.workPerformedIdentifiers)) {
    //         andConditions.push({
    //             'workPerformed.identifier': { $in: searchConditions.workPerformedIdentifiers }
    //         });
    //     }

    //     // 開始日時条件
    //     // tslint:disable-next-line:no-single-line-block-comment
    //     /* istanbul ignore else */
    //     if (searchConditions.startFrom !== undefined) {
    //         andConditions.push({
    //             startDate: { $gte: searchConditions.startFrom }
    //         });
    //     }
    //     // tslint:disable-next-line:no-single-line-block-comment
    //     /* istanbul ignore else */
    //     if (searchConditions.startThrough !== undefined) {
    //         andConditions.push({
    //             startDate: { $lt: searchConditions.startThrough }
    //         });
    //     }

    //     // 終了日時条件
    //     // tslint:disable-next-line:no-single-line-block-comment
    //     /* istanbul ignore else */
    //     if (searchConditions.endFrom !== undefined) {
    //         andConditions.push({
    //             endDate: { $gte: searchConditions.endFrom }
    //         });
    //     }
    //     // tslint:disable-next-line:no-single-line-block-comment
    //     /* istanbul ignore else */
    //     if (searchConditions.endThrough !== undefined) {
    //         andConditions.push({
    //             endDate: { $lt: searchConditions.endThrough }
    //         });
    //     }

    //     return <factory.event.individualScreeningEvent.IEvent[]>await this.eventModel.find({ $and: andConditions })
    //         .sort({ startDate: 1 })
    //         .setOptions({ maxTimeMS: 10000 })
    //         .lean()
    //         .exec();
    // }

    /**
     * identifierでイベントを取得する
     */
    public async findByIdentifier(
        typeOf: factory.eventType,
        identifier: string
    ): Promise<factory.event.IEvent> {
        const doc = await this.eventModel.findOne({
            typeOf: typeOf,
            identifier: identifier
        }).exec();

        if (doc === null) {
            throw new factory.errors.NotFound('event');
        }

        return doc.toObject();
    }
}
