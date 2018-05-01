/**
 * メニューアイテム承認アクションサービス
 */

import * as factory from '@motionpicture/kwskfs-factory';
import * as createDebug from 'debug';

import { MongoRepository as ActionRepo } from '../../../../../../../repo/action';
import { MongoRepository as EventRepo } from '../../../../../../../repo/event';
import { MongoRepository as OrganizationRepo } from '../../../../../../../repo/organization';
import { MongoRepository as TransactionRepo } from '../../../../../../../repo/transaction';

const debug = createDebug('kwskfs-domain:service:transaction:placeOrderInProgress:action:authorize:offer:eventReservation:menuItem');

export type ICreateOperation<T> = (repos: {
    organization: OrganizationRepo;
    event: EventRepo;
    action: ActionRepo;
    transaction: TransactionRepo;
}) => Promise<T>;

export type IAuthorizeAction = factory.action.authorize.offer.eventReservation.menuItem.IAction;

// tslint:disable-next-line:max-func-body-length
export function create(params: {
    agentId: string;
    transactionId: string;
    organizationIdentifier: string;
    eventType: factory.eventType;
    eventIdentifier: string;
    menuItemIdentifier: string;
    offerIdentifier: string;
    acceptedQuantity: number;
}): ICreateOperation<IAuthorizeAction> {
    // tslint:disable-next-line:max-func-body-length
    return async (repos: {
        organization: OrganizationRepo;
        event: EventRepo;
        action: ActionRepo;
        transaction: TransactionRepo;
    }) => {
        const transaction = await repos.transaction.findPlaceOrderInProgressById(params.transactionId);

        if (transaction.agent.id !== params.agentId) {
            throw new factory.errors.Forbidden('A specified transaction is not yours.');
        }

        const event = await repos.event.findByIdentifier(params.eventType, params.eventIdentifier);
        if (event.attendee === undefined) {
            throw new factory.errors.NotFound('Attendee for this event');
        }

        const attendee = event.attendee.find((a) => (<factory.organization.IOrganization>a).identifier === params.organizationIdentifier);
        if (attendee === undefined) {
            throw new factory.errors.Argument('organizationIdentifier', 'Not attend the event.');
        }

        const restaurants = await repos.organization.search({
            typeOf: factory.organizationType.Restaurant,
            identifiers: [params.organizationIdentifier],
            limit: 1
        });
        if (restaurants.length === 0) {
            throw new factory.errors.NotFound('Organization');
        }

        const restaurant = restaurants[0];

        // メニューアイテムリストをマージ
        debug('merge menu items from restaurants...');
        const menuItems: factory.organization.restaurant.IMenuItem[] = [];
        restaurant.hasMenu.forEach((menu) => {
            menu.hasMenuSection.forEach((menuSection) => {
                menuItems.push(...menuSection.hasMenuItem);
            });
        });

        // メニューアイテムの存在確認
        debug('finding menu item...', params.menuItemIdentifier);
        const menuItem = menuItems.find((i) => i.identifier === params.menuItemIdentifier);
        if (menuItem === undefined) {
            throw new factory.errors.NotFound('MenuItem');
        }

        // 販売情報の存在確認
        debug('finding offer...', params.offerIdentifier);
        if (menuItem.offers === undefined) {
            throw new factory.errors.NotFound('Offer');
        }
        const acceptedOffer = menuItem.offers.find((o) => o.identifier === params.offerIdentifier);
        if (acceptedOffer === undefined) {
            throw new factory.errors.NotFound('Offer');
        }

        // 承認アクションを開始
        debug('starting authorize action of menuItem...', params.menuItemIdentifier, params.offerIdentifier);
        const price = acceptedOffer.price * params.acceptedQuantity;
        const underName = {
            typeOf: factory.personType.Person,
            name: {
                ja: '',
                en: ''
            }
        };
        const issuedBy = {
            typeOf: transaction.seller.typeOf,
            name: {
                ja: transaction.seller.name,
                en: transaction.seller.name
            }
        };
        const actionAttributes: factory.action.authorize.offer.eventReservation.menuItem.IAttributes = {
            typeOf: factory.actionType.AuthorizeAction,
            object: {
                typeOf: acceptedOffer.typeOf,
                price: price,
                priceCurrency: acceptedOffer.priceCurrency,
                itemOffered: {
                    typeOf: factory.reservationType.EventReservation,
                    additionalTicketText: '',
                    modifiedTime: new Date(),
                    numMenuItems: params.acceptedQuantity,
                    price: price,
                    priceCurrency: acceptedOffer.priceCurrency,
                    provider: attendee,
                    reservationFor: event,
                    reservationNumber: '',
                    reservationStatus: factory.reservationStatusType.ReservationHold,
                    reservedTicket: {
                        typeOf: 'Ticket',
                        dateIssued: new Date(),
                        issuedBy: issuedBy,
                        totalPrice: price,
                        priceCurrency: factory.priceCurrency.JPY,
                        ticketedMenuItem: {
                            identifier: menuItem.identifier,
                            typeOf: menuItem.typeOf,
                            name: menuItem.name,
                            description: menuItem.description
                        },
                        ticketNumber: '',
                        ticketToken: '',
                        underName: underName
                    },
                    underName: underName
                }
            },
            agent: transaction.seller,
            recipient: transaction.agent,
            purpose: transaction
        };
        const action = await repos.action.start(actionAttributes);

        try {
            // 在庫確保？
        } catch (error) {
            // actionにエラー結果を追加
            try {
                const actionError = (error instanceof Error) ? { ...error, ...{ message: error.message } } : error;
                await repos.action.giveUp(action.typeOf, action.id, actionError);
            } catch (__) {
                // 失敗したら仕方ない
            }

            throw new factory.errors.ServiceUnavailable('Unexepected error occurred.');
        }

        // アクションを完了
        debug('ending authorize action...');
        const result: factory.action.authorize.offer.eventReservation.menuItem.IResult = {
            price: price,
            priceCurrency: acceptedOffer.priceCurrency
        };

        return repos.action.complete<IAuthorizeAction>(action.typeOf, action.id, result);
    };
}

/**
 * 承認アクションをキャンセルする
 * @param agentId アクション主体ID
 * @param transactionId 取引ID
 * @param actionId アクションID
 */
export function cancel(
    agentId: string,
    transactionId: string,
    actionId: string
) {
    return async (repos: {
        action: ActionRepo;
        transaction: TransactionRepo;
    }) => {
        const transaction = await repos.transaction.findPlaceOrderInProgressById(transactionId);

        if (transaction.agent.id !== agentId) {
            throw new factory.errors.Forbidden('A specified transaction is not yours.');
        }

        const action = await repos.action.cancel(factory.actionType.AuthorizeAction, actionId);
        debug('action canceld.', action.id);
        // const actionResult = <factory.action.authorize.offer.eventReservation.seat.IResult>action.result;
    };
}
