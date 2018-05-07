/**
 * 販売情報サービス
 */
import * as factory from '@motionpicture/kwskfs-factory';
import * as createDebug from 'debug';

import { MongoRepository as EventRepo } from '../repo/event';
import { RedisRepository as OfferItemAvailabilityRepo } from '../repo/itemAvailability/offer';
import { MongoRepository as OrganizationRepo } from '../repo/organization';

const debug = createDebug('kwskfs-domain:service:offer');

export type ISearchEventOffersOperation<T> = (repos: {
    event: EventRepo;
    organization: OrganizationRepo;
    offerItemAvailability: OfferItemAvailabilityRepo;
}) => Promise<T>;

/**
 * イベントタイプによる販売情報インターフェース
 */
export type IOfferByEventType<T> =
    T extends factory.eventType.FoodEvent ? factory.organization.restaurant.IOrganization :
    any;

/**
 * イベントの販売情報を取得する
 */
export function searchEventOffers<T extends factory.eventType>(params: {
    eventType: T;
    eventIdentifier: string;
}): ISearchEventOffersOperation<IOfferByEventType<T>[]> {
    return async (repos: {
        event: EventRepo;
        organization: OrganizationRepo;
        offerItemAvailability: OfferItemAvailabilityRepo;
    }) => {
        let offers: IOfferByEventType<T>[] = [];

        const event = await repos.event.findByIdentifier(params.eventType, params.eventIdentifier);

        switch (params.eventType) {
            // フードイベントの場合、参加店舗のリストを返す
            case factory.eventType.FoodEvent:
                if (event.attendee !== undefined) {
                    const restaurants = await repos.organization.search({
                        typeOf: factory.organizationType.Restaurant,
                        identifiers: event.attendee.map((a) => (<factory.organization.IOrganization>a).identifier),
                        limit: 100
                    });
                    debug('restaurants found.', restaurants);

                    await Promise.all(restaurants.map(async (restaurant) => {
                        // メニューアイテムリストをマージ
                        debug('merge menu items from restaurants...');
                        await Promise.all(restaurant.hasMenu.map(async (menu) => {
                            await Promise.all(menu.hasMenuSection.map(async (menuSection) => {
                                // メニューアイテムごとに在庫状況を検索する
                                await Promise.all(menuSection.hasMenuItem.map(async (menuItem) => {
                                    const availabilities = await repos.offerItemAvailability.findByMenuItem(
                                        restaurant.id, menuItem.identifier
                                    );
                                    debug('availabilities found.', restaurant.id, menuItem.identifier, availabilities);

                                    if (menuItem.offers !== undefined) {
                                        menuItem.offers.forEach((offer) => {
                                            (<any>offer).availability = (availabilities[offer.identifier] !== undefined) ?
                                                availabilities[offer.identifier] :
                                                'InStock';
                                        });
                                    }
                                }));
                            }));
                        }));
                    }));

                    offers = <IOfferByEventType<T>[]>restaurants;
                }

                break;

            default:
        }

        return offers;
    };
}
