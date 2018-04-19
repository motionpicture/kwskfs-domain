import * as factory from '@motionpicture/kwskfs-factory';
import { Connection } from 'mongoose';
import ownershipInfoModel from './mongoose/model/ownershipInfo';

export type IScreeningEvent = factory.event.individualScreeningEvent.IEvent;
export type IScreeningEventReservation = factory.reservation.event.IEventReservation<IScreeningEvent>;
export type IScreeningEventReservationOwnershipInfo = factory.ownershipInfo.IOwnershipInfo<IScreeningEventReservation>;

/**
 * 所有権リポジトリー
 */
export class MongoRepository {
    public readonly ownershipInfoModel: typeof ownershipInfoModel;

    constructor(connection: Connection) {
        this.ownershipInfoModel = connection.model(ownershipInfoModel.modelName);
    }

    /**
     * save an ownershipInfo
     * 所有権情報を保管する
     * @param ownershipInfo ownershipInfo object
     */
    public async save(ownershipInfo: factory.ownershipInfo.IOwnershipInfo<any>) {
        await this.ownershipInfoModel.findOneAndUpdate(
            {
                identifier: ownershipInfo.identifier
            },
            ownershipInfo,
            { upsert: true }
        ).exec();
    }

    /**
     * 上映イベント予約の所有権を検索する
     */
    public async searchScreeningEventReservation(searchConditions: {
        ownedBy?: string;
        ownedAt?: Date;
    }): Promise<IScreeningEventReservationOwnershipInfo[]> {
        const andConditions: any[] = [
            { 'typeOfGood.typeOf': factory.reservationType.EventReservation }, // 所有対象がイベント予約
            {
                'typeOfGood.reservationFor.typeOf': {
                    $exists: true,
                    $eq: factory.eventType.IndividualScreeningEvent
                }
            } // 予約対象が個々の上映イベント
        ];

        // 誰の所有か
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (searchConditions.ownedBy !== undefined) {
            andConditions.push({
                'ownedBy.id': {
                    $exists: true,
                    $eq: searchConditions.ownedBy
                }
            });
        }

        // いつの時点での所有か
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        if (searchConditions.ownedAt instanceof Date) {
            andConditions.push({
                ownedFrom: { $lte: searchConditions.ownedAt },
                ownedThrough: { $gte: searchConditions.ownedAt }
            });
        }

        return this.ownershipInfoModel.find({ $and: andConditions })
            .sort({ ownedFrom: 1 })
            .exec()
            .then((docs) => docs.map((doc) => <IScreeningEventReservationOwnershipInfo>doc.toObject()));
    }
}
