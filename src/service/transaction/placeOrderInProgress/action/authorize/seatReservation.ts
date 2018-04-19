/**
 * 座席予約承認アクションサービス
 * @namespace service.transaction.placeOrderInProgress.action.authorize.seatReservation
 */

import * as COA from '@motionpicture/coa-service';
import * as factory from '@motionpicture/kwskfs-factory';
import * as createDebug from 'debug';
import { INTERNAL_SERVER_ERROR } from 'http-status';

import { MongoRepository as ActionRepo } from '../../../../../repo/action';
import { MongoRepository as EventRepo } from '../../../../../repo/event';
import { MongoRepository as TransactionRepo } from '../../../../../repo/transaction';

const debug = createDebug('kwskfs-domain:service:transaction:placeOrderInProgress:action:authorize:seatReservation');

export type ICreateOperation<T> = (repos: {
    event: EventRepo;
    action: ActionRepo;
    transaction: TransactionRepo;
}) => Promise<T>;
export type IActionAndTransactionOperation<T> = (repos: {
    action: ActionRepo;
    transaction: TransactionRepo;
}) => Promise<T>;

/**
 * 座席予約に対する承認アクションを開始する前の処理
 * 供給情報の有効性の確認などを行う。
 * この処理次第で、どのような供給情報を受け入れられるかが決定するので、とても大事な処理です。
 * バグ、不足等あれば、随時更新することが望ましい。
 * @param isMember 会員かどうか
 * @param individualScreeningEvent 上映イベント
 * @param offers 供給情報
 */
// tslint:disable-next-line:max-func-body-length
async function validateOffers(
    isMember: boolean,
    individualScreeningEvent: factory.event.individualScreeningEvent.IEvent,
    offers: factory.offer.seatReservation.IOffer[]
): Promise<factory.offer.seatReservation.IOfferWithDetails[]> {
    debug('individualScreeningEvent:', individualScreeningEvent);
    // 詳細情報ありの供給情報リストを初期化
    // 要求された各供給情報について、バリデーションをかけながら、このリストに追加していく
    const offersWithDetails: factory.offer.seatReservation.IOfferWithDetails[] = [];

    // 供給情報が適切かどうか確認
    const availableSalesTickets: COA.services.reserve.ISalesTicketResult[] = [];

    // COA券種取得(非会員)
    const salesTickets4nonMember = await COA.services.reserve.salesTicket({
        theaterCode: individualScreeningEvent.coaInfo.theaterCode,
        dateJouei: individualScreeningEvent.coaInfo.dateJouei,
        titleCode: individualScreeningEvent.coaInfo.titleCode,
        titleBranchNum: individualScreeningEvent.coaInfo.titleBranchNum,
        timeBegin: individualScreeningEvent.coaInfo.timeBegin,
        flgMember: COA.services.reserve.FlgMember.NonMember
    });
    availableSalesTickets.push(...salesTickets4nonMember);

    // COA券種取得(会員)
    if (isMember) {
        const salesTickets4member = await COA.services.reserve.salesTicket({
            theaterCode: individualScreeningEvent.coaInfo.theaterCode,
            dateJouei: individualScreeningEvent.coaInfo.dateJouei,
            titleCode: individualScreeningEvent.coaInfo.titleCode,
            titleBranchNum: individualScreeningEvent.coaInfo.titleBranchNum,
            timeBegin: individualScreeningEvent.coaInfo.timeBegin,
            flgMember: COA.services.reserve.FlgMember.Member
        });
        availableSalesTickets.push(...salesTickets4member);
    }

    debug('availableSalesTickets:', availableSalesTickets);

    // 利用可能でないチケットコードが供給情報に含まれていれば引数エラー
    // 供給情報ごとに確認
    // tslint:disable-next-line:max-func-body-length
    await Promise.all(offers.map(async (offer, offerIndex) => {
        // ムビチケの場合
        if (offer.ticketInfo.mvtkAppPrice > 0) {
            // ムビチケ情報をCOA券種に変換
            let availableSalesTicket: COA.services.master.IMvtkTicketcodeResult;
            try {
                debug('finding mvtkTicket...', offer.ticketInfo.ticketCode, {
                    theaterCode: individualScreeningEvent.coaInfo.theaterCode,
                    kbnDenshiken: offer.ticketInfo.mvtkKbnDenshiken,
                    kbnMaeuriken: offer.ticketInfo.mvtkKbnMaeuriken,
                    kbnKensyu: offer.ticketInfo.mvtkKbnKensyu,
                    salesPrice: offer.ticketInfo.mvtkSalesPrice,
                    appPrice: offer.ticketInfo.mvtkAppPrice,
                    kbnEisyahousiki: offer.ticketInfo.kbnEisyahousiki,
                    titleCode: individualScreeningEvent.coaInfo.titleCode,
                    titleBranchNum: individualScreeningEvent.coaInfo.titleBranchNum
                });
                availableSalesTicket = await COA.services.master.mvtkTicketcode({
                    theaterCode: individualScreeningEvent.coaInfo.theaterCode,
                    kbnDenshiken: offer.ticketInfo.mvtkKbnDenshiken,
                    kbnMaeuriken: offer.ticketInfo.mvtkKbnMaeuriken,
                    kbnKensyu: offer.ticketInfo.mvtkKbnKensyu,
                    salesPrice: offer.ticketInfo.mvtkSalesPrice,
                    appPrice: offer.ticketInfo.mvtkAppPrice,
                    kbnEisyahousiki: offer.ticketInfo.kbnEisyahousiki,
                    titleCode: individualScreeningEvent.coaInfo.titleCode,
                    titleBranchNum: individualScreeningEvent.coaInfo.titleBranchNum
                });
            } catch (error) {
                // COAサービスエラーの場合ハンドリング
                if (error.name === 'COAServiceError') {
                    // COAはクライアントエラーかサーバーエラーかに関わらずステータスコード200 or 500を返却する。
                    // 500未満であればクライアントエラーとみなす
                    // tslint:disable-next-line:no-single-line-block-comment
                    /* istanbul ignore else */
                    if (error.code < INTERNAL_SERVER_ERROR) {
                        throw new factory.errors.NotFound(
                            `offers.${offerIndex}`,
                            `ticketCode ${offer.ticketInfo.ticketCode} not found. ${error.message}`
                        );
                    }
                }

                throw error;
            }

            // COA券種が見つかっても、指定された券種コードと異なればエラー
            if (offer.ticketInfo.ticketCode !== availableSalesTicket.ticketCode) {
                throw new factory.errors.NotFound(
                    `offers.${offerIndex}`,
                    `ticketInfo of ticketCode ${offer.ticketInfo.ticketCode} is invalid.`);
            }

            const offerWithDetails: factory.offer.seatReservation.IOfferWithDetails = {
                price: offer.ticketInfo.mvtkSalesPrice + availableSalesTicket.addPrice,
                priceCurrency: factory.priceCurrency.JPY,
                seatNumber: offer.seatNumber,
                seatSection: offer.seatSection,
                ticketInfo: {
                    ticketCode: availableSalesTicket.ticketCode,
                    ticketName: availableSalesTicket.ticketName,
                    ticketNameEng: availableSalesTicket.ticketNameEng,
                    ticketNameKana: availableSalesTicket.ticketNameKana,
                    stdPrice: 0,
                    addPrice: availableSalesTicket.addPrice,
                    disPrice: 0,
                    salePrice: availableSalesTicket.addPrice,
                    addGlasses: 0, // まずメガネ代金なしでデータをセット
                    mvtkAppPrice: offer.ticketInfo.mvtkAppPrice,
                    ticketCount: 1,
                    seatNum: offer.seatNumber,
                    kbnEisyahousiki: offer.ticketInfo.kbnEisyahousiki,
                    mvtkNum: offer.ticketInfo.mvtkNum,
                    mvtkKbnDenshiken: offer.ticketInfo.mvtkKbnDenshiken,
                    mvtkKbnMaeuriken: offer.ticketInfo.mvtkKbnMaeuriken,
                    mvtkKbnKensyu: offer.ticketInfo.mvtkKbnKensyu,
                    mvtkSalesPrice: offer.ticketInfo.mvtkSalesPrice
                }
            };

            // メガネ代込みの要求の場合は、販売単価調整&メガネ代をセット
            const includeGlasses = (offer.ticketInfo.addGlasses > 0);
            if (includeGlasses) {
                offerWithDetails.ticketInfo.ticketName = `${availableSalesTicket.ticketName}メガネ込み`;
                offerWithDetails.price += availableSalesTicket.addPriceGlasses;
                offerWithDetails.ticketInfo.salePrice += availableSalesTicket.addPriceGlasses;
                offerWithDetails.ticketInfo.addGlasses = availableSalesTicket.addPriceGlasses;
            }

            offersWithDetails.push(offerWithDetails);
        } else {
            const availableSalesTicket = availableSalesTickets.find(
                (salesTicket) => salesTicket.ticketCode === offer.ticketInfo.ticketCode
            );

            // 利用可能な券種が見つからなければエラー
            if (availableSalesTicket === undefined) {
                throw new factory.errors.NotFound(`offers.${offerIndex}`, `ticketCode ${offer.ticketInfo.ticketCode} not found.`);
            }

            // 制限単位がn人単位(例えば夫婦割り)の場合、同一券種の数を確認
            // '001'の値は、区分マスター取得APIにて、"kubunCode": "011"を指定すると取得できる
            if (availableSalesTicket.limitUnit === '001') {
                const numberOfSameOffer = offers.filter((o) => o.ticketInfo.ticketCode === availableSalesTicket.ticketCode).length;
                // tslint:disable-next-line:no-single-line-block-comment
                /* istanbul ignore else */
                if (numberOfSameOffer % availableSalesTicket.limitCount !== 0) {
                    // 割引条件が満たされていません
                    // 選択した券種の中に、割引券が含まれています。
                    // 割引券の適用条件を再度ご確認ください。
                    const invalidOfferIndexes = offers.reduce<number[]>(
                        (a, b, index) => (b.ticketInfo.ticketCode === availableSalesTicket.ticketCode) ? [...a, ...[index]] : a,
                        []
                    );

                    throw invalidOfferIndexes.map((index) => new factory.errors.Argument(`offers.${index}`, '割引条件が満たされていません。'));
                }
            }

            const offerWithDetails: factory.offer.seatReservation.IOfferWithDetails = {
                price: availableSalesTicket.salePrice,
                priceCurrency: factory.priceCurrency.JPY,
                seatNumber: offer.seatNumber,
                seatSection: offer.seatSection,
                ticketInfo: {
                    ticketCode: availableSalesTicket.ticketCode,
                    ticketName: availableSalesTicket.ticketName,
                    ticketNameEng: availableSalesTicket.ticketNameEng,
                    ticketNameKana: availableSalesTicket.ticketNameKana,
                    stdPrice: availableSalesTicket.stdPrice,
                    addPrice: availableSalesTicket.addPrice,
                    disPrice: 0,
                    salePrice: availableSalesTicket.salePrice,
                    addGlasses: 0,
                    mvtkAppPrice: 0,
                    ticketCount: 1,
                    seatNum: offer.seatNumber,
                    kbnEisyahousiki: '00', // ムビチケを使用しない場合の初期値をセット
                    mvtkNum: '', // ムビチケを使用しない場合の初期値をセット
                    mvtkKbnDenshiken: '00', // ムビチケを使用しない場合の初期値をセット
                    mvtkKbnMaeuriken: '00', // ムビチケを使用しない場合の初期値をセット
                    mvtkKbnKensyu: '00', // ムビチケを使用しない場合の初期値をセット
                    mvtkSalesPrice: 0 // ムビチケを使用しない場合の初期値をセット
                }
            };

            // メガネ代込みの要求の場合は、販売単価調整&メガネ代をセット
            const includeGlasses = (offer.ticketInfo.addGlasses > 0);
            if (includeGlasses) {
                offerWithDetails.ticketInfo.ticketName = `${availableSalesTicket.ticketName}メガネ込み`;
                offerWithDetails.price += availableSalesTicket.addGlasses;
                offerWithDetails.ticketInfo.salePrice += availableSalesTicket.addGlasses;
                offerWithDetails.ticketInfo.addGlasses = availableSalesTicket.addGlasses;
            }

            offersWithDetails.push(offerWithDetails);
        }
    }));

    return offersWithDetails;
}

/**
 * 供給情報から承認アクションの価格を導き出す
 * @param offers 供給情報
 */
function offers2resultPrice(offers: factory.offer.seatReservation.IOfferWithDetails[]) {
    return offers.reduce((a, b) => a + b.price, 0);
}

/**
 * 座席を仮予約する
 * 承認アクションオブジェクトが返却されます。
 * @export
 * @param agentId 取引主体ID
 * @param transactionId 取引ID
 * @param eventIdentifier イベント識別子
 * @param offers 供給情報
 */
export function create(
    agentId: string,
    transactionId: string,
    eventIdentifier: string,
    offers: factory.offer.seatReservation.IOffer[]
): ICreateOperation<factory.action.authorize.seatReservation.IAction> {
    return async (repos: {
        event: EventRepo;
        action: ActionRepo;
        transaction: TransactionRepo;
    }) => {
        const transaction = await repos.transaction.findPlaceOrderInProgressById(transactionId);

        if (transaction.agent.id !== agentId) {
            throw new factory.errors.Forbidden('A specified transaction is not yours.');
        }

        // 上映イベントを取得
        const individualScreeningEvent = await repos.event.findIndividualScreeningEventByIdentifier(eventIdentifier);

        // 供給情報の有効性を確認
        const offersWithDetails = await validateOffers((transaction.agent.memberOf !== undefined), individualScreeningEvent, offers);

        // 承認アクションを開始
        const actionAttributes = factory.action.authorize.seatReservation.createAttributes({
            object: {
                typeOf: factory.action.authorize.seatReservation.ObjectType.SeatReservation,
                offers: offersWithDetails,
                individualScreeningEvent: individualScreeningEvent
            },
            agent: transaction.seller,
            recipient: transaction.agent,
            purpose: transaction // purposeは取引
        });
        const action = await repos.action.start<factory.action.authorize.seatReservation.IAction>(actionAttributes);

        // COA仮予約
        const updTmpReserveSeatArgs = {
            theaterCode: individualScreeningEvent.coaInfo.theaterCode,
            dateJouei: individualScreeningEvent.coaInfo.dateJouei,
            titleCode: individualScreeningEvent.coaInfo.titleCode,
            titleBranchNum: individualScreeningEvent.coaInfo.titleBranchNum,
            timeBegin: individualScreeningEvent.coaInfo.timeBegin,
            screenCode: individualScreeningEvent.coaInfo.screenCode,
            listSeat: offers.map((offer) => {
                return {
                    seatSection: offer.seatSection,
                    seatNum: offer.seatNumber
                };
            })
        };
        let updTmpReserveSeatResult: COA.services.reserve.IUpdTmpReserveSeatResult;
        try {
            debug('updTmpReserveSeat processing...', updTmpReserveSeatArgs);
            updTmpReserveSeatResult = await COA.services.reserve.updTmpReserveSeat(updTmpReserveSeatArgs);
            debug('updTmpReserveSeat processed', updTmpReserveSeatResult);
        } catch (error) {
            // actionにエラー結果を追加
            try {
                const actionError = (error instanceof Error) ? { ...error, ...{ message: error.message } } : error;
                await repos.action.giveUp(action.typeOf, action.id, actionError);
            } catch (__) {
                // 失敗したら仕方ない
            }

            // メッセージ「座席取得失敗」の場合は、座席の重複とみなす
            if (error.message === '座席取得失敗') {
                throw new factory.errors.AlreadyInUse('action.object', ['offers'], error.message);
            }

            // COAはクライアントエラーかサーバーエラーかに関わらずステータスコード200 or 500を返却する。
            const coaServiceHttpStatusCode = error.code;

            // 500未満であればクライアントエラーとみなす
            if (Number.isInteger(coaServiceHttpStatusCode)) {
                if (coaServiceHttpStatusCode < INTERNAL_SERVER_ERROR) {
                    throw new factory.errors.Argument('individualScreeningEvent', error.message);
                } else {
                    throw new factory.errors.ServiceUnavailable('Reservation service temporarily unavailable.');
                }
            }

            throw new factory.errors.ServiceUnavailable('Unexepected error occurred.');
        }

        // アクションを完了
        debug('ending authorize action...');
        const result: factory.action.authorize.seatReservation.IResult = {
            price: offers2resultPrice(offersWithDetails),
            updTmpReserveSeatArgs: updTmpReserveSeatArgs,
            updTmpReserveSeatResult: updTmpReserveSeatResult
        };

        return repos.action.complete<factory.action.authorize.seatReservation.IAction>(action.typeOf, action.id, result);
    };
}

/**
 * 座席予約承認アクションをキャンセルする
 * @export
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

        // MongoDBでcompleteステータスであるにも関わらず、COAでは削除されている、というのが最悪の状況
        // それだけは回避するためにMongoDBを先に変更
        const action = await repos.action.cancel(factory.actionType.AuthorizeAction, actionId);
        const actionResult = <factory.action.authorize.seatReservation.IResult>action.result;

        // 座席仮予約削除
        debug('delTmpReserve processing...', action);
        await COA.services.reserve.delTmpReserve({
            theaterCode: actionResult.updTmpReserveSeatArgs.theaterCode,
            dateJouei: actionResult.updTmpReserveSeatArgs.dateJouei,
            titleCode: actionResult.updTmpReserveSeatArgs.titleCode,
            titleBranchNum: actionResult.updTmpReserveSeatArgs.titleBranchNum,
            timeBegin: actionResult.updTmpReserveSeatArgs.timeBegin,
            tmpReserveNum: actionResult.updTmpReserveSeatResult.tmpReserveNum
        });
        debug('delTmpReserve processed');
    };
}

/**
 * 座席予約承認アクションの供給情報を変更する
 * @export
 * @param agentId アクション主体ID
 * @param transactionId 取引ID
 * @param actionId アクションID
 * @param eventIdentifier イベント識別子
 * @param offers 供給情報
 */
export function changeOffers(
    agentId: string,
    transactionId: string,
    actionId: string,
    eventIdentifier: string,
    offers: factory.offer.seatReservation.IOffer[]
): ICreateOperation<factory.action.authorize.seatReservation.IAction> {
    return async (repos: {
        event: EventRepo;
        action: ActionRepo;
        transaction: TransactionRepo;
    }) => {
        const transaction = await repos.transaction.findPlaceOrderInProgressById(transactionId);

        if (transaction.agent.id !== agentId) {
            throw new factory.errors.Forbidden('A specified transaction is not yours.');
        }

        // アクション中のイベント識別子と座席リストが合っているかどうか確認
        const authorizeAction = await repos.action.findById<factory.action.authorize.seatReservation.IAction>(
            factory.actionType.AuthorizeAction, actionId
        );
        // 完了ステータスのアクションのみ更新可能
        if (authorizeAction.actionStatus !== factory.actionStatusType.CompletedActionStatus) {
            throw new factory.errors.NotFound('authorizeAction');
        }
        // 上映イベントが一致しているかどうか
        if (authorizeAction.object.individualScreeningEvent.identifier !== eventIdentifier) {
            throw new factory.errors.Argument('eventIdentifier', 'eventIdentifier not matched.');
        }
        // 座席セクションと座席番号が一致しているかどうか
        const allSeatsMatched = authorizeAction.object.offers.every((offer, index) => {
            return (offer.seatSection === offers[index].seatSection && offer.seatNumber === offers[index].seatNumber);
        });
        if (!allSeatsMatched) {
            throw new factory.errors.Argument('offers', 'seatSection or seatNumber not matched.');
        }

        // 上映イベントを取得
        const individualScreeningEvent = await repos.event.findIndividualScreeningEventByIdentifier(eventIdentifier);

        // 供給情報の有効性を確認
        const offersWithDetails = await validateOffers((transaction.agent.memberOf !== undefined), individualScreeningEvent, offers);

        // 供給情報と価格を変更してからDB更新
        authorizeAction.object.offers = offersWithDetails;
        (<factory.action.authorize.seatReservation.IResult>authorizeAction.result).price = offers2resultPrice(offersWithDetails);

        // 座席予約承認アクションの供給情報を変更する
        return repos.action.actionModel.findOneAndUpdate(
            {
                typeOf: factory.actionType.AuthorizeAction,
                _id: actionId,
                actionStatus: factory.actionStatusType.CompletedActionStatus // 完了ステータスのアクションのみ
            },
            {
                object: authorizeAction.object,
                result: (<factory.action.authorize.seatReservation.IResult>authorizeAction.result)
            },
            { new: true }
        ).exec()
            .then((doc) => {
                if (doc === null) {
                    throw new factory.errors.NotFound('authorizeAction');
                }

                return <factory.action.authorize.seatReservation.IAction>doc.toObject();
            });
    };
}
