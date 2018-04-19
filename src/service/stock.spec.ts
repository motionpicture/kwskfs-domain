// tslint:disable:no-implicit-dependencies

/**
 * stock service test
 * @ignore
 */

import * as assert from 'power-assert';
import * as sinon from 'sinon';
import * as kwskfs from '../index';

let sandbox: sinon.SinonSandbox;
let existingTransaction: any;

before(() => {
    sandbox = sinon.sandbox.create();
    existingTransaction = {
        id: '123',
        object: {
            customerContact: {
                telephone: '+819012345678'
            },
            authorizeActions: [
                {
                    id: 'actionId',
                    actionStatus: 'CompletedActionStatus',
                    object: { typeOf: kwskfs.factory.action.authorize.seatReservation.ObjectType.SeatReservation },
                    purpose: {},
                    result: {
                        price: 123,
                        acceptedOffers: [
                            {
                                price: 123,
                                itemOffered: {
                                    reservedTicket: {}
                                }
                            },
                            {
                                price: 456,
                                itemOffered: {
                                    reservedTicket: {}
                                }
                            }
                        ],
                        updTmpReserveSeatArgs: {
                            theaterCode: '123'
                        },
                        updTmpReserveSeatResult: {
                            tmpReserveNum: 123
                        }
                    }
                }
            ]
        },
        result: {
            order: {
                acceptedOffers: [
                    {
                        price: 123,
                        itemOffered: {
                            reservedTicket: {}
                        }
                    },
                    {
                        price: 456,
                        itemOffered: {
                            reservedTicket: {}
                        }
                    }
                ],
                price: 123
            },
            ownershipInfos: [{}, {}]
        }
    };
});

describe('cancelSeatReservationAuth()', () => {
    afterEach(() => {
        sandbox.restore();
    });

    it('取引に座席予約が存在すれば、仮予約解除が実行されるはず', async () => {
        const authorizeActions = [
            {
                id: 'actionId',
                actionStatus: kwskfs.factory.actionStatusType.CompletedActionStatus,
                object: { typeOf: kwskfs.factory.action.authorize.seatReservation.ObjectType.SeatReservation },
                purpose: {},
                result: {
                    updTmpReserveSeatArgs: {},
                    updTmpReserveSeatResult: {}
                }
            }
        ];
        const actionRepo = new kwskfs.repository.Action(kwskfs.mongoose.connection);

        sandbox.mock(actionRepo).expects('findAuthorizeByTransactionId').once()
            .withExactArgs(existingTransaction.id).resolves(authorizeActions);
        sandbox.mock(kwskfs.COA.services.reserve).expects('delTmpReserve').once().resolves();

        const result = await kwskfs.service.stock.cancelSeatReservationAuth(existingTransaction.id)({ action: actionRepo });

        assert.equal(result, undefined);
        sandbox.verify();
    });
});
