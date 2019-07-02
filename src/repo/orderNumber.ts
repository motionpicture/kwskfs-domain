import * as factory from '@motionpicture/kwskfs-factory';
import * as createDebug from 'debug';
import * as moment from 'moment';
import * as redis from 'redis';
// tslint:disable-next-line:no-require-imports no-var-requires
const orderId = require('order-id')('mysecret');

const debug = createDebug('kwskfs-domain:repository:orderNumber');

/**
 * 注文番号Redisリポジトリー
 */
export class RedisRepository {
    public static REDIS_KEY_PREFIX: string = 'orderNumber';
    public readonly redisClient: redis.RedisClient;

    constructor(redisClient: redis.RedisClient) {
        this.redisClient = redisClient;
    }

    /**
     * 発行する
     */
    public async publish(): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            // 注文番号生成(とりあえず今回は適当にライブラリ使用)
            const orderNumberSuffix = orderId.generate();
            const now = moment();
            const TTL = moment(now).add(1, 'hour').diff(now, 'seconds');
            debug(`TTL:${TTL} seconds`);
            const key = `${RedisRepository.REDIS_KEY_PREFIX}.${orderNumberSuffix}`;

            this.redisClient.multi()
                .incr(key, debug)
                .expire(key, TTL)
                .exec((err, results) => {
                    debug('results:', results);
                    if (err !== null) {
                        reject(err);
                    } else {
                        if (Number.isInteger(results[0])) {
                            const no: number = results[0];
                            debug('no incremented.', no);

                            // tslint:disable-next-line:no-magic-numbers
                            resolve(`${(`000${no}`).slice(-3)}-${orderNumberSuffix}`);
                        } else {
                            reject(new factory.errors.ServiceUnavailable());
                        }
                    }
                });
        });
    }
}
