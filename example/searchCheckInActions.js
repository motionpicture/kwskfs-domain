/**
 * イベント検索サンプル
 * @ignore
 */

const kwskfs = require('../');
const fs = require('fs');

async function main() {
    await kwskfs.mongoose.connect(process.env.MONGOLAB_URI);

    const repository = new kwskfs.repository.Action(kwskfs.mongoose.connection);
    const ownershipInfoRepo = new kwskfs.repository.OwnershipInfo(kwskfs.mongoose.connection);
    let checkInActions = await repository.actionModel.find(
        {
            typeOf: kwskfs.factory.actionType.CheckInAction
        },
        '_id typeOf startDate endDate actionStatus object.reservedTicket.ticketToken object.reservedTicket.typeOf'
    )
        .lean()
        .exec()
        .then((actions) => actions.map((a) => {
            return {
                id: a._id,
                ticketToken: a.object.reservedTicket.ticketToken,
                actionStatus: a.actionStatus,
                startDate: a.startDate,
                endDate: a.endDate,
                sub: '',
                username: ''
            };
        }));
    console.log(checkInActions.length, 'checkInActions found.')

    const ticketTokens = await ownershipInfoRepo.search({ goodType: kwskfs.factory.reservationType.EventReservation })
        .then((ownershipInfos) => ownershipInfos.map((o) => {
            return {
                sub: o.ownedBy.id,
                ticketToken: o.typeOfGood.reservedTicket.ticketToken
            }
        }));

    const users = require(`${__dirname}/users.json`);
    console.log(users.length, 'users found.');

    checkInActions = checkInActions.map((a) => {
        const ticketTokenValue = ticketTokens.find((t) => t.ticketToken === a.ticketToken);
        const userValue = users.find((u) => u.sub === ticketTokenValue.sub);
        return {
            ...a,
            sub: (userValue !== undefined) ? userValue.sub : '',
            username: (userValue !== undefined) ? userValue.username : ''
        }
    });

    await kwskfs.mongoose.disconnect();
    fs.writeFileSync(`${__dirname}/checkInActions.json`, JSON.stringify(checkInActions, null, '    '));
}

main().then(() => {
    console.log('success!');
}).catch((error) => {
    console.error(error);
    process.exit(1);
});
