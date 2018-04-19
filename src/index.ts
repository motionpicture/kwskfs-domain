// tslint:disable:max-classes-per-file completed-docs

/**
 * kwskfs-domain index module
 * @module
 */

import * as COA from '@motionpicture/coa-service';
import * as GMO from '@motionpicture/gmo-service';
import * as factory from '@motionpicture/kwskfs-factory';
import * as pecorinoapi from '@motionpicture/pecorino-api-nodejs-client';
import * as mongoose from 'mongoose';
import * as redis from 'redis';

import * as DeliveryService from './service/delivery';
import * as ItemAvailabilityService from './service/itemAvailability';
import * as MasterSyncService from './service/masterSync';
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

import { MongoRepository as ActionRepo } from './repo/action';
import { MongoRepository as PrintActionRepo } from './repo/action/print';
import { MongoRepository as ClientRepo } from './repo/client';
import { MongoRepository as CreativeWorkRepo } from './repo/creativeWork';
import { MongoRepository as EventRepo } from './repo/event';
import { MongoRepository as GMONotificationRepo } from './repo/gmoNotification';
import { MongoRepository as IndividualScreeningEventItemAvailabilityRepo } from './repo/itemAvailability/individualScreeningEvent';
import { MongoRepository as OrderRepo } from './repo/order';
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
 * COAのAPIクライアント
 *
 * @example
 * kwskfs.COA.services.master.theater({ theater_code: '118' }).then(() => {
 *     console.log(result);
 * });
 */
export import COA = COA;

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
    export class Action extends ActionRepo { }
    export namespace action {
        export class Print extends PrintActionRepo { }
    }
    export class Client extends ClientRepo { }
    export class CreativeWork extends CreativeWorkRepo { }
    export class Event extends EventRepo { }
    export class GMONotification extends GMONotificationRepo { }
    export class Order extends OrderRepo { }
    export class Organization extends OrganizationRepo { }
    export class OwnershipInfo extends OwnershipInfoRepo { }
    export class Place extends PlaceRepo { }
    export class SendGridEvent extends SendGridEventRepo { }
    export class Task extends TaskRepo { }
    export class Telemetry extends TelemetryRepo { }
    export class Transaction extends TransactionRepo { }

    export namespace itemAvailability {
        export class IndividualScreeningEvent extends IndividualScreeningEventItemAvailabilityRepo { }
    }
}

export namespace service {
    export import delivery = DeliveryService;
    export import offer = OfferService;
    export import itemAvailability = ItemAvailabilityService;
    export import masterSync = MasterSyncService;
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