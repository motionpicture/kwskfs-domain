/**
 * 進行中注文取引サービス
 * @namespace service.transaction.placeOrderInProgress
 */

import * as factory from '@motionpicture/kwskfs-factory';
import * as waiter from '@motionpicture/waiter-domain';
import * as createDebug from 'debug';
import { PhoneNumberFormat, PhoneNumberUtil } from 'google-libphonenumber';
import * as moment from 'moment-timezone';
import * as pug from 'pug';
import * as util from 'util';
import * as uuid from 'uuid';
// tslint:disable-next-line:no-require-imports no-var-requires
const orderId = require('order-id')('mysecret');

import { MongoRepository as ActionRepo } from '../../repo/action';
import { MongoRepository as OrganizationRepo } from '../../repo/organization';
import { MongoRepository as TransactionRepo } from '../../repo/transaction';

import * as CreditCardAuthorizeActionService from './placeOrderInProgress/action/authorize/creditCard';
import * as MenuItemAuthorizeActionService from './placeOrderInProgress/action/authorize/offer/eventReservation/menuItem';
import * as SeatReservationAuthorizeActionService from './placeOrderInProgress/action/authorize/offer/eventReservation/seat';
import * as PecorinoAuthorizeActionService from './placeOrderInProgress/action/authorize/pecorino';

const debug = createDebug('kwskfs-domain:service:transaction:placeOrderInProgress');

export type ITransactionOperation<T> = (repos: { transaction: TransactionRepo }) => Promise<T>;
export type IOrganizationAndTransactionAndTransactionCountOperation<T> = (repos: {
    organization: OrganizationRepo;
    transaction: TransactionRepo;
}) => Promise<T>;

/**
 * 取引開始パラメーターインターフェース
 */
export interface IStartParams {
    /**
     * 取引期限
     */
    expires: Date;
    /**
     * 取引主体ID
     */
    agentId: string;
    /**
     * 販売者ID
     */
    sellerId: string;
    /**
     * APIクライアント
     */
    clientUser: factory.clientUser.IClientUser;
    /**
     * WAITER許可証トークン
     */
    passportToken?: waiter.factory.passport.IEncodedPassport;
}

/**
 * 取引開始
 */
export function start(params: IStartParams):
    IOrganizationAndTransactionAndTransactionCountOperation<factory.transaction.placeOrder.ITransaction> {
    return async (repos: {
        organization: OrganizationRepo;
        transaction: TransactionRepo;
    }) => {
        // 売り手を取得
        const seller = await repos.organization.findById(params.sellerId);

        let passport: waiter.factory.passport.IPassport | undefined;

        // WAITER許可証トークンがあれば検証する
        if (params.passportToken !== undefined) {
            try {
                passport = await waiter.service.passport.verify(params.passportToken, <string>process.env.WAITER_SECRET);
            } catch (error) {
                throw new factory.errors.Argument('passportToken', `Invalid token. ${error.message}`);
            }

            // スコープを判別
            if (!validatePassport(passport)) {
                throw new factory.errors.Argument('passportToken', 'Invalid passport.');
            }
            // } else {
            //     throw new factory.errors.ArgumentNull('passportToken');
        }

        const agent: factory.transaction.placeOrder.IAgent = {
            typeOf: factory.personType.Person,
            id: params.agentId,
            url: ''
        };
        if (params.clientUser.username !== undefined) {
            agent.memberOf = {
                membershipNumber: params.agentId,
                programName: 'Cognito'
            };
        }

        // 取引ファクトリーで新しい進行中取引オブジェクトを作成
        const transactionAttributes = factory.transaction.placeOrder.createAttributes({
            status: factory.transactionStatusType.InProgress,
            agent: agent,
            seller: {
                typeOf: seller.typeOf,
                id: seller.id,
                name: seller.name.ja,
                url: (seller.url !== undefined) ? seller.url : ''
            },
            object: {
                passportToken: params.passportToken,
                passport: passport,
                clientUser: params.clientUser,
                authorizeActions: []
            },
            expires: params.expires,
            startDate: new Date(),
            tasksExportationStatus: factory.transactionTasksExportationStatus.Unexported
        });

        let transaction: factory.transaction.placeOrder.ITransaction;
        try {
            transaction = await repos.transaction.start<factory.transaction.placeOrder.ITransaction>(transactionAttributes);
        } catch (error) {
            if (error.name === 'MongoError') {
                // 許可証を重複使用しようとすると、MongoDBでE11000 duplicate key errorが発生する
                // name: 'MongoError',
                // message: 'E11000 duplicate key error collection: kwskfs-development-v2.transactions...',
                // code: 11000,

                // tslint:disable-next-line:no-single-line-block-comment
                /* istanbul ignore else */
                // tslint:disable-next-line:no-magic-numbers
                if (error.code === 11000) {
                    throw new factory.errors.AlreadyInUse('transaction', ['passportToken'], 'Passport already used.');
                }
            }

            throw error;
        }

        return transaction;
    };
}

/**
 * WAITER許可証の有効性チェック
 * @param passport WAITER許可証
 * @param sellerIdentifier 販売者識別子
 */
function validatePassport(passport: waiter.factory.passport.IPassport) {
    // スコープのフォーマットは、placeOrderTransaction.{sellerId}
    // const explodedScopeStrings = passport.scope.split('.');

    return passport.iss === <string>process.env.WAITER_PASSPORT_ISSUER;
    // return (
    //     passport.iss === <string>process.env.WAITER_PASSPORT_ISSUER && // 許可証発行者確認
    //     // tslint:disable-next-line:no-magic-numbers
    //     explodedScopeStrings.length === 2 &&
    //     explodedScopeStrings[0] === 'placeOrderTransaction' && // スコープ接頭辞確認
    //     explodedScopeStrings[1] === sellerIdentifier // 販売者識別子確認
    // );
}

/**
 * 取引に対するアクション
 */
export namespace action {
    /**
     * 取引に対する承認アクション
     */
    export namespace authorize {
        /**
         * クレジットカード承認アクションサービス
         */
        export import creditCard = CreditCardAuthorizeActionService;
        /**
         * Pecorino承認アクションサービス
         */
        export import pecorino = PecorinoAuthorizeActionService;
        export namespace offer {
            export namespace eventReservation {
                export import seat = SeatReservationAuthorizeActionService;
                export import menuItem = MenuItemAuthorizeActionService;
            }
        }
    }
}

/**
 * 取引中の購入者情報を変更する
 */
export function setCustomerContact(
    agentId: string,
    transactionId: string,
    contact: factory.transaction.placeOrder.ICustomerContact
): ITransactionOperation<factory.transaction.placeOrder.ICustomerContact> {
    return async (repos: { transaction: TransactionRepo }) => {
        let formattedTelephone: string;
        try {
            const phoneUtil = PhoneNumberUtil.getInstance();
            const phoneNumber = phoneUtil.parse(contact.telephone, 'JP'); // 日本の電話番号前提仕様
            if (!phoneUtil.isValidNumber(phoneNumber)) {
                throw new Error('invalid phone number format.');
            }

            formattedTelephone = phoneUtil.format(phoneNumber, PhoneNumberFormat.E164);
        } catch (error) {
            throw new factory.errors.Argument('contact.telephone', error.message);
        }

        // 連絡先を再生成(validationの意味も含めて)
        const customerContact: factory.transaction.placeOrder.ICustomerContact = {
            familyName: contact.familyName,
            givenName: contact.givenName,
            email: contact.email,
            telephone: formattedTelephone
        };

        const transaction = await repos.transaction.findPlaceOrderInProgressById(transactionId);

        if (transaction.agent.id !== agentId) {
            throw new factory.errors.Forbidden('A specified transaction is not yours.');
        }

        await repos.transaction.setCustomerContactOnPlaceOrderInProgress(transactionId, customerContact);

        return customerContact;
    };
}

/**
 * 取引確定
 */
// tslint:disable-next-line:max-func-body-length
export function confirm(
    agentId: string,
    transactionId: string
) {
    // tslint:disable-next-line:max-func-body-length
    return async (repos: {
        action: ActionRepo;
        transaction: TransactionRepo;
        organization: OrganizationRepo;
    }) => {
        const now = moment().toDate();
        const transaction = await repos.transaction.findPlaceOrderInProgressById(transactionId);
        if (transaction.agent.id !== agentId) {
            throw new factory.errors.Forbidden('A specified transaction is not yours.');
        }

        const seller = await repos.organization.findById(transaction.seller.id);
        debug('seller found.', seller.identifier);

        const customerContact = transaction.object.customerContact;
        if (customerContact === undefined) {
            throw new factory.errors.NotFound('customerContact');
        }

        // 取引に対する全ての承認アクションをマージ
        let authorizeActions = await repos.action.findAuthorizeByTransactionId(transactionId);

        // 万が一このプロセス中に他処理が発生してもそれらを無視するように、endDateでフィルタリング
        authorizeActions = authorizeActions.filter((a) => (a.endDate !== undefined && a.endDate < now));
        transaction.object.authorizeActions = authorizeActions;

        // 照会可能になっているかどうか
        validateTransaction(transaction);

        // 結果作成
        const order = createOrderFromTransaction({
            transaction: transaction,
            orderDate: now,
            orderStatus: factory.orderStatus.OrderProcessing,
            isGift: false
        });

        // tslint:disable-next-line:max-line-length
        type IOwnershipInfo = factory.ownershipInfo.IOwnershipInfo<factory.reservation.event.IEventReservation<factory.event.IEvent>>;
        const ownershipInfos: IOwnershipInfo[] = order.acceptedOffers.map((acceptedOffer) => {
            // ownershipInfoのidentifierはコレクション内でuniqueである必要があるので、この仕様には要注意
            // saveする際に、identifierでfindOneAndUpdateしている
            const identifier = acceptedOffer.itemOffered.reservedTicket.ticketToken;
            const event = acceptedOffer.itemOffered.reservationFor;

            return {
                typeOf: <'OwnershipInfo'>'OwnershipInfo',
                identifier: identifier,
                ownedBy: {
                    id: transaction.agent.id,
                    typeOf: transaction.agent.typeOf,
                    name: order.customer.name
                },
                acquiredFrom: transaction.seller,
                ownedFrom: now,
                // イベント予約に対する所有権の有効期限はイベント終了日時までで十分だろう
                // 現時点では所有権対象がイベント予約のみなので、これで問題ないが、
                // 対象が他に広がれば、有効期間のコントロールは別でしっかり行う必要があるだろう
                ownedThrough: event.endDate,
                typeOfGood: acceptedOffer.itemOffered
            };
        });

        // クレジットカード支払いアクション
        let payCreditCardAction: factory.action.trade.pay.IAttributes | null = null;
        const creditCardPayment = order.paymentMethods.find((m) => m.paymentMethod === factory.paymentMethodType.CreditCard);
        if (creditCardPayment !== undefined) {
            payCreditCardAction = factory.action.trade.pay.createAttributes({
                object: {
                    paymentMethod: creditCardPayment,
                    price: order.price,
                    priceCurrency: order.priceCurrency
                },
                agent: transaction.agent,
                purpose: order
            });
        }

        // クレジットカード支払いアクション
        let payPecorinoAction: factory.action.trade.pay.IAttributes | null = null;
        const pecorinoPayment = order.paymentMethods.find((m) => m.paymentMethod === factory.paymentMethodType.Pecorino);
        if (pecorinoPayment !== undefined) {
            payPecorinoAction = factory.action.trade.pay.createAttributes({
                object: {
                    paymentMethod: pecorinoPayment,
                    price: order.price,
                    priceCurrency: order.priceCurrency
                },
                agent: transaction.agent,
                purpose: order
            });
        }

        const result: factory.transaction.placeOrder.IResult = {
            order: order,
            ownershipInfos: ownershipInfos
        };

        // const emailMessage = await createEmailMessageFromTransaction({
        //     transaction: transaction,
        //     customerContact: customerContact,
        //     order: order,
        //     seller: seller
        // });
        // const sendEmailMessageActionAttributes = factory.action.transfer.send.message.email.createAttributes({
        //     actionStatus: factory.actionStatusType.ActiveActionStatus,
        //     object: emailMessage,
        //     agent: transaction.seller,
        //     recipient: transaction.agent,
        //     potentialActions: {},
        //     purpose: order
        // });
        const potentialActions: factory.transaction.placeOrder.IPotentialActions = {
            order: factory.action.trade.order.createAttributes({
                object: order,
                agent: transaction.agent,
                potentialActions: {
                    // クレジットカード決済があれば支払アクション追加
                    payCreditCard: (payCreditCardAction !== null) ? payCreditCardAction : undefined,
                    // Pecorino決済があれば支払アクション追加
                    payPecorino: (payPecorinoAction !== null) ? payPecorinoAction : undefined,
                    sendOrder: factory.action.transfer.send.order.createAttributes({
                        actionStatus: factory.actionStatusType.ActiveActionStatus,
                        object: order,
                        agent: transaction.seller,
                        recipient: transaction.agent,
                        potentialActions: {
                            // tslint:disable-next-line:no-suspicious-comment
                            // TODO メール送信アクションをセットする
                            // 現時点では、フロントエンドからメール送信タスクを作成しているので不要
                            // sendEmailMessage: sendEmailMessageActionAttributes
                        }
                    })
                }
            })
        };

        // ステータス変更
        debug('updating transaction...');
        await repos.transaction.confirmPlaceOrder(
            transactionId,
            authorizeActions,
            result,
            potentialActions
        );

        return order;
    };
}

/**
 * 取引が確定可能な状態かどうかをチェックする
 */
export function validateTransaction(transaction: factory.transaction.placeOrder.ITransaction) {
    type IAuthorizeActionResult =
        factory.action.authorize.creditCard.IResult |
        factory.action.authorize.pecorino.IResult;

    // クレジットカードオーソリをひとつに限定
    const creditCardAuthorizeActions = transaction.object.authorizeActions
        .filter((a) => a.actionStatus === factory.actionStatusType.CompletedActionStatus)
        .filter((a) => a.object.typeOf === factory.action.authorize.creditCard.ObjectType.CreditCard);
    if (creditCardAuthorizeActions.length > 1) {
        throw new factory.errors.Argument('transactionId', 'The number of credit card authorize actions must be one.');
    }

    // agentとsellerで、承認アクションの金額が合うかどうか
    const priceByAgent = transaction.object.authorizeActions
        .filter((authorizeAction) => authorizeAction.actionStatus === factory.actionStatusType.CompletedActionStatus)
        .filter((authorizeAction) => authorizeAction.agent.id === transaction.agent.id)
        .reduce((a, b) => a + (<IAuthorizeActionResult>b.result).price, 0);
    const priceBySeller = transaction.object.authorizeActions
        .filter((authorizeAction) => authorizeAction.actionStatus === factory.actionStatusType.CompletedActionStatus)
        .filter((authorizeAction) => authorizeAction.agent.id === transaction.seller.id)
        .reduce((a, b) => a + (<IAuthorizeActionResult>b.result).price, 0);
    debug('priceByAgent priceBySeller:', priceByAgent, priceBySeller);

    if (priceByAgent <= 0 || priceByAgent !== priceBySeller) {
        throw new factory.errors.Argument('transactionId', 'Transaction cannot be confirmed because prices are not matched.');
    }
}

/**
 * create order object from transaction parameters
 * 取引オブジェクトから注文オブジェクトを生成する
 */
// tslint:disable-next-line:max-func-body-length
export function createOrderFromTransaction(params: {
    transaction: factory.transaction.placeOrder.ITransaction;
    orderDate: Date;
    orderStatus: factory.orderStatus;
    isGift: boolean;
}): factory.order.IOrder {
    // 実験的にメニューアイテムの注文の場合
    // tslint:disable-next-line:no-single-line-block-comment
    /* istanbul ignore next */
    const menuItemAuthorizeActions =
        (<factory.action.authorize.offer.eventReservation.menuItem.IAction[]>params.transaction.object.authorizeActions)
            .filter((a) => a.actionStatus === factory.actionStatusType.CompletedActionStatus)
            .filter((a) => a.object.typeOf === 'Offer')
            .filter((a) => a.object.itemOffered.reservedTicket.ticketedMenuItem !== undefined);
    // tslint:disable-next-line:no-single-line-block-comment
    /* istanbul ignore next */
    if (menuItemAuthorizeActions.length > 0) {
        return createMenuItemOrderFromTransaction(params);
    }

    // seatReservation exists?
    const seatReservationAuthorizeActions =
        (<factory.action.authorize.offer.eventReservation.seat.IAction[]>params.transaction.object.authorizeActions)
            .filter((a) => a.actionStatus === factory.actionStatusType.CompletedActionStatus)
            .filter((a) => a.object.typeOf === 'Offer')
            .filter((a) => a.object.itemOffered.reservedTicket.ticketedSeat !== undefined);
    if (seatReservationAuthorizeActions.length === 0) {
        throw new factory.errors.Argument('transaction', 'Seat reservation does not exist.');
    }
    // if (seatReservationAuthorizeActions.length > 1) {
    //     throw new factory.errors.NotImplemented('Number of seat reservation authorizeAction must be 1.');
    // }
    // const seatReservationAuthorizeAction = seatReservationAuthorizeActions[0];
    // if (seatReservationAuthorizeAction.result === undefined) {
    //     throw new factory.errors.Argument('transaction', 'Seat reservation result does not exist.');
    // }
    const cutomerContact = params.transaction.object.customerContact;
    if (cutomerContact === undefined) {
        throw new factory.errors.Argument('transaction', 'Customer contact does not exist');
    }

    const confirmationNumber = 123;
    const orderInquiryKey = {
        confirmationNumber: confirmationNumber,
        telephone: cutomerContact.telephone
    };

    // 結果作成
    const discounts: factory.order.IDiscount[] = [];
    const paymentMethods: factory.order.IPaymentMethod[] = [];

    // クレジットカード決済があれば決済方法に追加
    params.transaction.object.authorizeActions
        .filter((a) => a.actionStatus === factory.actionStatusType.CompletedActionStatus)
        .filter((a) => a.object.typeOf === factory.action.authorize.creditCard.ObjectType.CreditCard)
        .forEach((creditCardAuthorizeAction: factory.action.authorize.creditCard.IAction) => {
            paymentMethods.push({
                name: factory.paymentMethodType.CreditCard,
                paymentMethod: factory.paymentMethodType.CreditCard,
                paymentMethodId: (<factory.action.authorize.creditCard.IResult>creditCardAuthorizeAction.result).execTranResult.orderId
            });
        });

    // pecorino決済があれば決済方法に追加
    params.transaction.object.authorizeActions
        .filter((a) => a.actionStatus === factory.actionStatusType.CompletedActionStatus)
        .filter((a) => a.object.typeOf === factory.action.authorize.pecorino.ObjectType.Pecorino)
        .forEach((pecorinoAuthorizeAction: any) => {
            paymentMethods.push({
                name: factory.paymentMethodType.Pecorino,
                paymentMethod: factory.paymentMethodType.Pecorino,
                paymentMethodId: pecorinoAuthorizeAction.result.pecorinoTransaction.id
            });
        });

    const seller: factory.order.ISeller = params.transaction.seller;
    const customer: factory.order.ICustomer = {
        ...{
            id: params.transaction.agent.id,
            typeOf: params.transaction.agent.typeOf,
            name: `${cutomerContact.familyName} ${cutomerContact.givenName}`,
            url: ''
        },
        ...cutomerContact
    };
    if (params.transaction.agent.memberOf !== undefined) {
        customer.memberOf = params.transaction.agent.memberOf;
    }

    // 座席仮予約から容認供給情報を生成する
    // 座席予約以外の注文アイテムが追加された場合は、このロジックに修正が加えられることになる
    const underName = {
        typeOf: customer.typeOf,
        name: {
            ja: `${customer.familyName} ${customer.givenName}`,
            en: `${customer.givenName} ${customer.familyName}`
        }
    };
    const acceptedOffers = seatReservationAuthorizeActions.map((a) => {
        // 最終的なチケット情報を更新
        const offer = a.object;
        const ticketToken = uuid.v4();
        offer.itemOffered.underName = underName;
        offer.itemOffered.modifiedTime = params.orderDate;
        offer.itemOffered.reservedTicket.ticketNumber = '';
        offer.itemOffered.reservedTicket.ticketToken = ticketToken;
        offer.itemOffered.reservedTicket.dateIssued = params.orderDate;
        offer.itemOffered.reservedTicket.underName = underName;

        return {
            ...offer,
            seller: {
                typeOf: params.transaction.seller.typeOf,
                name: params.transaction.seller.name
            }
        };
    });

    // 注文番号生成
    const orderNumber = orderId.generate();

    type ActionResult = factory.action.authorize.offer.eventReservation.seat.IResult;
    const price = seatReservationAuthorizeActions.reduce((a, b) => a + (<ActionResult>b.result).price, 0);

    return {
        typeOf: 'Order',
        seller: seller,
        customer: customer,
        price: price - discounts.reduce((a, b) => a + b.discount, 0),
        priceCurrency: factory.priceCurrency.JPY,
        paymentMethods: paymentMethods,
        discounts: discounts,
        confirmationNumber: confirmationNumber,
        orderNumber: orderNumber,
        acceptedOffers: acceptedOffers,
        // tslint:disable-next-line:max-line-length
        url: '',
        orderStatus: params.orderStatus,
        orderDate: params.orderDate,
        isGift: params.isGift,
        orderInquiryKey: orderInquiryKey
    };
}

/**
 * メニューアイテムの注文を作成する
 */
// tslint:disable-next-line:no-single-line-block-comment
/* istanbul ignore next */
// tslint:disable-next-line:max-func-body-length
export function createMenuItemOrderFromTransaction(params: {
    transaction: factory.transaction.placeOrder.ITransaction;
    orderDate: Date;
    orderStatus: factory.orderStatus;
    isGift: boolean;
}): factory.order.IOrder {
    // 実験的にメニューアイテムの注文の場合
    // tslint:disable-next-line:no-single-line-block-comment
    /* istanbul ignore next */
    const menuItemAuthorizeActions =
        (<factory.action.authorize.offer.eventReservation.menuItem.IAction[]>params.transaction.object.authorizeActions)
            .filter((a) => a.actionStatus === factory.actionStatusType.CompletedActionStatus)
            .filter((a) => a.object.typeOf === 'Offer')
            .filter((a) => a.object.itemOffered.reservedTicket.ticketedMenuItem !== undefined);
    if (menuItemAuthorizeActions.length === 0) {
        throw new factory.errors.Argument('transaction', 'Menu item authorize action result does not exist.');
    }

    if (params.transaction.object.customerContact === undefined) {
        throw new factory.errors.Argument('transaction', 'Customer contact does not exist');
    }

    const cutomerContact = params.transaction.object.customerContact;
    const confirmationNumber = 123;
    const orderInquiryKey = {
        confirmationNumber: confirmationNumber,
        telephone: cutomerContact.telephone
    };

    // 結果作成
    const discounts: factory.order.IDiscount[] = [];

    const paymentMethods: factory.order.IPaymentMethod[] = [];

    // クレジットカード決済があれば決済方法に追加
    params.transaction.object.authorizeActions
        .filter((a) => a.actionStatus === factory.actionStatusType.CompletedActionStatus)
        .filter((a) => a.object.typeOf === factory.action.authorize.creditCard.ObjectType.CreditCard)
        .forEach((creditCardAuthorizeAction: factory.action.authorize.creditCard.IAction) => {
            paymentMethods.push({
                name: factory.paymentMethodType.CreditCard,
                paymentMethod: factory.paymentMethodType.CreditCard,
                paymentMethodId: (<factory.action.authorize.creditCard.IResult>creditCardAuthorizeAction.result).execTranResult.orderId
            });
        });

    // pecorino決済があれば決済方法に追加
    params.transaction.object.authorizeActions
        .filter((a) => a.actionStatus === factory.actionStatusType.CompletedActionStatus)
        .filter((a) => a.object.typeOf === 'Pecorino')
        .forEach((pecorinoAuthorizeAction: any) => {
            paymentMethods.push({
                name: 'Pecorino',
                paymentMethod: factory.paymentMethodType.Pecorino,
                paymentMethodId: pecorinoAuthorizeAction.result.pecorinoTransaction.id
            });
        });

    const seller: factory.order.ISeller = params.transaction.seller;
    const customer: factory.order.ICustomer = {
        ...{
            id: params.transaction.agent.id,
            typeOf: params.transaction.agent.typeOf,
            name: `${cutomerContact.familyName} ${cutomerContact.givenName}`,
            url: ''
        },
        ...params.transaction.object.customerContact
    };
    if (params.transaction.agent.memberOf !== undefined) {
        customer.memberOf = params.transaction.agent.memberOf;
    }

    type ActionResult = factory.action.authorize.offer.eventReservation.seat.IResult;
    const price = menuItemAuthorizeActions.reduce((a, b) => a + (<ActionResult>b.result).price, 0);
    const priceCurrency = factory.priceCurrency.JPY;

    const underName = {
        typeOf: customer.typeOf,
        name: {
            ja: `${customer.familyName} ${customer.givenName}`,
            en: `${customer.givenName} ${customer.familyName}`
        }
    };
    const acceptedOffers = menuItemAuthorizeActions.map((a) => {
        // 最終的なチケット情報を更新
        const offer = a.object;
        const ticketToken = uuid.v4();
        offer.itemOffered.underName = underName;
        offer.itemOffered.modifiedTime = params.orderDate;
        offer.itemOffered.reservedTicket.ticketNumber = '';
        offer.itemOffered.reservedTicket.ticketToken = ticketToken;
        offer.itemOffered.reservedTicket.dateIssued = params.orderDate;
        offer.itemOffered.reservedTicket.underName = underName;

        return {
            ...offer,
            seller: {
                typeOf: params.transaction.seller.typeOf,
                name: params.transaction.seller.name
            }
        };
    });

    // 注文番号生成
    const orderNumber = orderId.generate();

    return {
        typeOf: 'Order',
        seller: seller,
        customer: customer,
        price: price - discounts.reduce((a, b) => a + b.discount, 0),
        priceCurrency: priceCurrency,
        paymentMethods: paymentMethods,
        discounts: discounts,
        confirmationNumber: confirmationNumber,
        orderNumber: orderNumber,
        acceptedOffers: acceptedOffers,
        url: '',
        orderStatus: params.orderStatus,
        orderDate: params.orderDate,
        isGift: params.isGift,
        orderInquiryKey: orderInquiryKey
    };
}

export async function createEmailMessageFromTransaction(params: {
    transaction: factory.transaction.placeOrder.ITransaction;
    customerContact: factory.transaction.placeOrder.ICustomerContact;
    order: factory.order.IOrder;
    seller: factory.organization.IOrganization;
}): Promise<factory.creativeWork.message.email.ICreativeWork> {
    return new Promise<factory.creativeWork.message.email.ICreativeWork>((resolve, reject) => {
        const seller = params.transaction.seller;
        const event = params.order.acceptedOffers[0].itemOffered.reservationFor;

        pug.renderFile(
            `${__dirname}/../../../emails/sendOrder/text.pug`,
            {
                familyName: params.customerContact.familyName,
                givenName: params.customerContact.givenName,
                confirmationNumber: params.order.confirmationNumber,
                eventStartDate: (event !== undefined)
                    ? util.format(
                        '%s - %s',
                        moment(event.startDate).locale('ja').tz('Asia/Tokyo').format('YYYY年MM月DD日(ddd) HH:mm'),
                        moment(event.endDate).tz('Asia/Tokyo').format('HH:mm')
                    )
                    : '',
                screenName: (event !== undefined && event.location !== undefined && event.location.name !== undefined)
                    ? event.location.name.ja
                    : '',
                price: params.order.price,
                inquiryUrl: params.order.url,
                sellerName: params.order.seller.name,
                sellerTelephone: params.seller.telephone
            },
            (renderMessageErr, message) => {
                if (renderMessageErr instanceof Error) {
                    reject(renderMessageErr);

                    return;
                }

                debug('message:', message);
                pug.renderFile(
                    `${__dirname}/../../../emails/sendOrder/subject.pug`,
                    {
                        sellerName: params.order.seller.name
                    },
                    (renderSubjectErr, subject) => {
                        if (renderSubjectErr instanceof Error) {
                            reject(renderSubjectErr);

                            return;
                        }

                        debug('subject:', subject);

                        resolve(factory.creativeWork.message.email.create({
                            identifier: `placeOrderTransaction-${params.transaction.id}`,
                            sender: {
                                typeOf: seller.typeOf,
                                name: seller.name,
                                email: 'noreply@ticket-cinemasunshine.com'
                            },
                            toRecipient: {
                                typeOf: params.transaction.agent.typeOf,
                                name: `${params.customerContact.familyName} ${params.customerContact.givenName}`,
                                email: params.customerContact.email
                            },
                            about: subject,
                            text: message
                        }));
                    }
                );
            }
        );
    });
}
