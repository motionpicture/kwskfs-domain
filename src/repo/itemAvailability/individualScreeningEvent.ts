import * as factory from '@motionpicture/kwskfs-factory';
import * as createDebug from 'debug';
import * as redis from 'redis';

const debug = createDebug('kwskfs-domain:repository:itemAvailability:individualScreeningEvent');
const REDIS_KEY_PREFIX = 'kwskfs-domain:itemAvailability:individualScreeningEvent';
/**
 * 上映イベント在庫状況のRedisで有効期間
 */
const TIMEOUT_IN_SECONDS = 864000;

/**
 * 上映イベント在庫状況リポジトリー
 */
export class MongoRepository {
    public readonly redisClient: redis.RedisClient;

    constructor(redisClient: redis.RedisClient) {
        this.redisClient = redisClient;
    }

    /**
     * 上映イベントの上映日からredisキーを生成する
     * @param screeningDay 上映日
     */
    public static CREATE_REDIS_KEY(screeningDay: string): string {
        return `${REDIS_KEY_PREFIX}:${screeningDay}`;
    }

    /**
     * 在庫状況をひとつ取得する
     * @param screeningDay 上映日
     * @param eventIdentifier 上映イベント識別子
     */
    public async findOne(screeningDay: string, eventIdentifier: string):
        Promise<factory.event.individualScreeningEvent.IItemAvailability | null> {
        const key = MongoRepository.CREATE_REDIS_KEY(screeningDay);

        return new Promise<factory.event.individualScreeningEvent.IItemAvailability | null>((resolve, reject) => {
            // 上映イベント在庫状況を取得
            this.redisClient.hget([key, eventIdentifier], (err, res) => {
                debug('hget processed.', err, res);
                if (err instanceof Error) {
                    reject(err);

                    return;
                }

                // 存在しなければすぐ返却
                if (res === null) {
                    resolve(res);

                    return;
                }

                // tslint:disable-next-line:no-magic-numbers
                const itemAvailability = parseInt((res instanceof Buffer) ? res.toString() : res, 10);
                resolve(itemAvailability);
            });
        });
    }

    /**
     * 在庫状況をひとつ更新する
     * @param screeningDay 上映日
     * @param eventIdentifier 上映イベント識別子
     * @param itemAvailability 在庫状況表現
     */
    public async updateOne(
        screeningDay: string,
        eventIdentifier: string,
        itemAvailability: factory.event.individualScreeningEvent.IItemAvailability
    ): Promise<void> {
        const key = MongoRepository.CREATE_REDIS_KEY(screeningDay);

        return new Promise<void>(async (resolve, reject) => {
            this.redisClient.hset([key, eventIdentifier, itemAvailability], (err) => {
                debug('hset processed.', err);
                if (err instanceof Error) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    /**
     * 上映日から在庫状況を削除する
     * @param screeningDay 上映日
     */
    public async removeByPerformaceDay(screeningDay: string): Promise<void> {
        const key = MongoRepository.CREATE_REDIS_KEY(screeningDay);

        return new Promise<void>(async (resolve, reject) => {
            this.redisClient.del([key], (err) => {
                debug('del processed.', err);
                if (err instanceof Error) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    /**
     * 上映日からredis cacheに期限をセットする
     * @param screeningDay 上映日
     */
    public async setTTLIfNotExist(screeningDay: string): Promise<void> {
        const key = MongoRepository.CREATE_REDIS_KEY(screeningDay);

        return new Promise<void>((resolve, reject) => {
            this.redisClient.ttl([key], (err, ttl) => {
                debug('ttl:', ttl);
                if (err instanceof Error) {
                    reject(err);

                    return;
                }

                // 存在していれば何もしない
                if (ttl > -1) {
                    resolve();

                    return;
                }

                // 期限セット
                this.redisClient.expire([key, TIMEOUT_IN_SECONDS], () => {
                    debug('set expire.', key, TIMEOUT_IN_SECONDS);
                    resolve();
                });
            });
        });
    }
}
