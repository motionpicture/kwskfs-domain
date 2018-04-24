/**
 * 販売情報サービス
 */

import * as factory from '@motionpicture/kwskfs-factory';
import * as createDebug from 'debug';

import { MongoRepository as EventRepository } from '../repo/event';
// tslint:disable-next-line:max-line-length
// import { MongoRepository as IndividualScreeningEventItemAvailabilityRepository } from '../repo/itemAvailability/individualScreeningEvent';

const debug = createDebug('kwskfs-domain:service:offer');

export type IEventOperation<T> = (repos: {
    event: EventRepository;
    // itemAvailability?: IndividualScreeningEventItemAvailabilityRepository;
}) => Promise<T>;

/**
 * イベントを識別子で取得する
 */
export function findEventByIdentifier(
    typeOf: factory.eventType,
    identifier: string
    // ): IEventOperation<factory.event.individualScreeningEvent.IEventWithOffer> {
): IEventOperation<any> {
    return async (repos: {
        event: EventRepository;
        // itemAvailability?: IndividualScreeningEventItemAvailabilityRepository;
    }) => {
        debug('finding event...', typeOf, identifier);
        const event = await repos.event.findByIdentifier(typeOf, identifier);

        // add item availability info
        const offer = {
            typeOf: 'Offer',
            availability: null,
            url: ''
        };
        // tslint:disable-next-line:no-single-line-block-comment
        /* istanbul ignore else */
        // if (repos.itemAvailability !== undefined) {
        //     offer.availability = await repos.itemAvailability.findOne(event.coaInfo.dateJouei, event.identifier);
        // }

        return { ...event, ...{ offer: offer } };
    };
}
