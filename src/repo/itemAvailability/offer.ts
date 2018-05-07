import * as factory from '@motionpicture/kwskfs-factory';
import * as createDebug from 'debug';
import * as redis from 'redis';

const debug = createDebug('kwskfs-domain:repository:offerItemAvailability');

export interface IAvailabilitiesById {
    [offerIdentifier: string]: string;
}

/**
 * オファーの在庫状況リポジトリー
 */
export class RedisRepository {
    public static KEY_PREFIX: string = 'offerItemAvailability';
    public readonly redisClient: redis.RedisClient;

    constructor(redisClient: redis.RedisClient) {
        this.redisClient = redisClient;
    }

    /**
     * メニューアイテムの在庫状況を保管する
     */
    public async storeByMenuItem(
        organizationId: string,
        menuItemIdentifier: string,
        availabilities: IAvailabilitiesById,
        ttl: number
    ): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const key = `${RedisRepository.KEY_PREFIX}.${organizationId}.${menuItemIdentifier}`;
            this.redisClient.multi()
                .hmset(key, availabilities)
                .expire(key, ttl)
                .exec((err, __) => {
                    debug('menu item availabilities stored.', err);
                    if (err !== null) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
        });
    }

    /**
     * メニューアイテムの特定オファーの在庫状況を保管する
     */
    public async storeByMenuItemOfferIdentifier(
        organizationId: string,
        menuItemIdentifier: string,
        offerIdentifier: string,
        availability: factory.itemAvailability,
        ttl: number
    ): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const key = `${RedisRepository.KEY_PREFIX}.${organizationId}.${menuItemIdentifier}`;
            this.redisClient.multi()
                .hset(key, offerIdentifier, availability)
                .expire(key, ttl)
                .exec((err, __) => {
                    debug('menu item offer availability stored.', err);
                    if (err !== null) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
        });
    }

    /**
     * メニューアイテムの在庫状況を検索する
     */
    public async findByMenuItem(organizationId: string, menuItemIdentifier: string): Promise<IAvailabilitiesById> {
        return new Promise<IAvailabilitiesById>((resolve, reject) => {
            const key = `${RedisRepository.KEY_PREFIX}.${organizationId}.${menuItemIdentifier}`;
            this.redisClient.hgetall(key, (err, result) => {
                debug('menu item availabilities on redis found.', err);
                if (err !== null) {
                    reject(err);
                } else {
                    resolve((result !== null) ? result : {});
                }
            });
        });
    }
}
