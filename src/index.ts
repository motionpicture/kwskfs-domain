// tslint:disable:max-classes-per-file completed-docs

/**
 * kwskfs-domain index module
 * @module
 */

import * as GMO from '@motionpicture/gmo-service';
import * as factory from '@motionpicture/kwskfs-factory';
import * as pecorinoapi from '@motionpicture/pecorino-api-nodejs-client';
import * as mongoose from 'mongoose';
import * as redis from 'redis';

import * as AuthenticationService from './service/authentication';
import * as DeliveryService from './service/delivery';
import * as NotificationService from './service/notification';
import * as OfferService from './service/offer';
import * as OrderService from './service/order';
import * as PaymentService from './service/payment';
import * as PersonContactService from './service/person/contact';
import * as PersonCreditCardService from './service/person/creditCard';
import * as ReportService from './service/report';
import * as StockService from './service/stock';
import * as TaskService from './service/task';
import * as PlaceOrderTransactionService from './service/transaction/placeOrder';
import * as PlaceOrderInProgressTransactionService from './service/transaction/placeOrderInProgress';
import * as ReturnOrderTransactionService from './service/transaction/returnOrder';
import * as UtilService from './service/util';

import { PecorinoRepository as AccountRepo } from './repo/account';
import { MongoRepository as ActionRepo } from './repo/action';
import { MongoRepository as PrintActionRepo } from './repo/action/print';
import { MongoRepository as ClientRepo } from './repo/client';
import { RedisRepository as ConfirmationNumberRepo } from './repo/confirmationNumber';
import { MongoRepository as CreativeWorkRepo } from './repo/creativeWork';
import { MongoRepository as EventRepo } from './repo/event';
import { MongoRepository as GMONotificationRepo } from './repo/gmoNotification';
import { RedisRepository as OfferItemAvailabilityRepo } from './repo/itemAvailability/offer';
import { MongoRepository as OrderRepo } from './repo/order';
import { RedisRepository as OrderNumberRepo } from './repo/orderNumber';
import { MongoRepository as OrganizationRepo } from './repo/organization';
import { MongoRepository as OwnershipInfoRepo } from './repo/ownershipInfo';
import { MongoRepository as PlaceRepo } from './repo/place';
import { MongoRepository as SendGridEventRepo } from './repo/sendGridEvent';
import { MongoRepository as TaskRepo } from './repo/task';
import { MongoRepository as TelemetryRepo } from './repo/telemetry';
import { MongoRepository as TransactionRepo } from './repo/transaction';

/**
 * MongoDBクライアント`mongoose`
 *
 * @example
 * var promise = kwskfs.mongoose.connect('mongodb://localhost/myapp', {
 *     useMongoClient: true
 * });
 */
export import mongoose = mongoose;

/**
 * Redis Cacheクライアント
 *
 * @example
 * const client = kwskfs.redis.createClient({
 *      host: process.env.REDIS_HOST,
 *      port: process.env.REDIS_PORT,
 *      password: process.env.REDIS_KEY,
 *      tls: { servername: process.env.TEST_REDIS_HOST }
 * });
 */
export import redis = redis;

/**
 * GMOのAPIクライアント
 *
 * @example
 * kwskfs.GMO.services.card.searchMember({
 *     siteId: '',
 *     sitePass: '',
 *     memberId: ''
 * }).then((result) => {
 *     console.log(result);
 * });
 */
export import GMO = GMO;

export import pecorinoapi = pecorinoapi;

export namespace repository {
    export class Account extends AccountRepo { }
    export class Action extends ActionRepo { }
    export namespace action {
        export class Print extends PrintActionRepo { }
    }
    export class Client extends ClientRepo { }
    export class CreativeWork extends CreativeWorkRepo { }
    export class ConfirmationNumber extends ConfirmationNumberRepo { }
    export class Event extends EventRepo { }
    export class GMONotification extends GMONotificationRepo { }
    export namespace itemAvailability {
        export class Offer extends OfferItemAvailabilityRepo { }
    }
    export class Order extends OrderRepo { }
    export class OrderNumber extends OrderNumberRepo { }
    export class Organization extends OrganizationRepo { }
    export class OwnershipInfo extends OwnershipInfoRepo { }
    export class Place extends PlaceRepo { }
    export class SendGridEvent extends SendGridEventRepo { }
    export class Task extends TaskRepo { }
    export class Telemetry extends TelemetryRepo { }
    export class Transaction extends TransactionRepo { }

    export namespace itemAvailability {
        // export class IndividualScreeningEvent extends IndividualScreeningEventItemAvailabilityRepo { }
    }
}

export namespace service {
    export import authentication = AuthenticationService;
    export import delivery = DeliveryService;
    export import offer = OfferService;
    export import notification = NotificationService;
    export import order = OrderService;
    export namespace person {
        export import contact = PersonContactService;
        export import creditCard = PersonCreditCardService;
    }
    export import report = ReportService;
    export import payment = PaymentService;
    export import stock = StockService;
    export import task = TaskService;
    export namespace transaction {
        export import placeOrder = PlaceOrderTransactionService;
        export import placeOrderInProgress = PlaceOrderInProgressTransactionService;
        export import returnOrder = ReturnOrderTransactionService;
    }
    export import util = UtilService;
}

export import factory = factory;
