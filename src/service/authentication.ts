/**
 * 認証(チケット)サービス
 */
import * as factory from '@motionpicture/kwskfs-factory';
import * as createDebug from 'debug';

import { MongoRepository as ActionRepo } from '../repo/action';
import { MongoRepository as OwnershipInfoRepo } from '../repo/ownershipInfo';

const debug = createDebug('kwskfs-domain:service:authentication');

export type ICheckInAction = factory.action.interact.communicate.checkIn.IAction;
export type ICheckInOperation<T> = (repos: {
    action: ActionRepo;
    ownershipInfo: OwnershipInfoRepo;
}) => Promise<T>;
export type ISearchCheckInOperation<T> = (repos: {
    action: ActionRepo;
}) => Promise<T>;

/**
 * チケットトークンでチェックインを実行する
 */
export function checkInByTicketToken<T extends factory.ownershipInfo.IGoodType>(params: {
    agent: any;
    goodType: T;
    ticketToken: string;
}): ICheckInOperation<ICheckInAction> {
    return async (repos: {
        action: ActionRepo;
        ownershipInfo: OwnershipInfoRepo;
    }) => {
        // 所有権検索
        debug('finding ownershipInfo by ticketToken...', params.ticketToken);
        const doc = await repos.ownershipInfo.ownershipInfoModel.findOne({
            'typeOfGood.typeOf': params.goodType,
            'typeOfGood.reservedTicket.ticketToken': {
                $exists: true,
                $eq: params.ticketToken
            }
        }).exec();

        // 所有権がなければNotFound
        if (doc === null) {
            throw new factory.errors.NotFound('OwnershipInfo');
        }
        const ownershipInfo: factory.ownershipInfo.IOwnershipInfo<T> = doc.toObject();

        // tslint:disable-next-line:no-suspicious-comment
        // TODO 所有期間チェック

        // アクション開始
        const actionAttributes = {
            typeOf: factory.actionType.CheckInAction,
            agent: params.agent,
            object: ownershipInfo.typeOfGood
        };
        const action = await repos.action.start(actionAttributes);

        try {
            // 何かする？
        } catch (error) {
            // actionにエラー結果を追加
            try {
                const actionError = { ...error, message: error.message, name: error.name };
                await repos.action.giveUp(actionAttributes.typeOf, action.id, actionError);
            } catch (__) {
                // 失敗したら仕方ない
            }

            throw error;
        }

        // アクション完了
        const actionResult: any = {};

        return repos.action.complete<ICheckInAction>(actionAttributes.typeOf, action.id, actionResult);
    };
}

/**
 * チェックインアクションを検索する
 */
export function searchCheckInActions<T extends factory.ownershipInfo.IGoodType>(params: {
    goodType: T;
    ticketTokens?: string[];
}): ISearchCheckInOperation<ICheckInAction[]> {
    return async (repos: {
        action: ActionRepo;
    }) => {
        const andConditions: any[] = [
            { typeOf: factory.actionType.CheckInAction },
            {
                'object.typeOf': {
                    $exists: true,
                    $eq: params.goodType
                }
            }
        ];

        if (Array.isArray(params.ticketTokens) && params.ticketTokens.length > 0) {
            andConditions.push({
                'object.reservedTicket.ticketToken': {
                    $exists: true,
                    $in: params.ticketTokens
                }
            });
        }

        // アクション検索
        return repos.action.actionModel.find({ $and: andConditions })
            .sort({ startDate: 1 })
            .exec()
            .then((docs) => docs.map((doc) => doc.toObject()));
    };
}
