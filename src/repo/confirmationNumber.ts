import * as factory from '@motionpicture/kwskfs-factory';
import * as createDebug from 'debug';
import * as moment from 'moment';
import * as redis from 'redis';

const debug = createDebug('kwskfs-domain:repository:confirmationNumber');

/**
 * 確認番号Rediリポジトリー
 */
export class RedisRepository {
    public static REDIS_KEY_PREFIX: string = 'confirmationNumber';
    public readonly redisClient: redis.RedisClient;

    constructor(redisClient: redis.RedisClient) {
        this.redisClient = redisClient;
    }

    /**
     * イベントから発行する
     */
    public async publishByEvent(event: factory.event.IEvent): Promise<number> {
        return new Promise<number>((resolve, reject) => {
            // イベント終了日時を過ぎたら期限が切れるようにTTLを設定
            const now = moment();
            const TTL = moment(event.endDate).add(1, 'day').diff(now, 'seconds');
            debug(`TTL:${TTL} seconds`);
            const key = `${RedisRepository.REDIS_KEY_PREFIX}.${event.typeOf}.${event.identifier}`;

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

                            resolve(no);
                        } else {
                            reject(new factory.errors.ServiceUnavailable());
                        }
                    }
                });
        });
    }
}
