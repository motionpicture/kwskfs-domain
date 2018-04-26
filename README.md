<img src="https://motionpicture.jp/images/common/logo_01.svg" alt="motionpicture" title="motionpicture" align="right" height="56" width="98"/>

# KWSKFS Domain Library for Node.js

[![CircleCI](https://circleci.com/gh/motionpicture/kwskfs-domain.svg?style=svg&circle-token=26025d5a2df8ffd61173c72bbc1257fc6a2ad66d)](https://circleci.com/gh/motionpicture/kwskfs-domain)

KWSKFSのバックエンドサービスをnode.jsで簡単に使用するためのパッケージを提供します。

## Table of contents

* [Usage](#usage)
* [Code Samples](#code-samples)
* [Jsdoc](#jsdoc)
* [License](#license)

## Usage

```shell
npm install @motionpicture/kwskfs-domain
```

### Environment variables

| Name                                        | Required | Value                             | Purpose                |
|---------------------------------------------|----------|-----------------------------------|------------------------|
| `DEBUG`                                     | false    | kwskfs-domain:*                   | Debug                  |
| `NPM_TOKEN`                                 | true     |                                   | NPM auth token         |
| `NODE_ENV`                                  | true     |                                   | environment name       |
| `MONGOLAB_URI`                              | true     |                                   | MongoDB connection URI |
| `SENDGRID_API_KEY`                          | true     |                                   | SendGrid API Key       |
| `GMO_ENDPOINT`                              | true     |                                   | GMO API endpoint       |
| `GMO_SITE_ID`                               | true     |                                   | GMO SiteID             |
| `GMO_SITE_PASS`                             | true     |                                   | GMO SitePass           |
| `KWSKFS_DEVELOPER_LINE_NOTIFY_ACCESS_TOKEN` | true     |                                   | 開発者通知用LINEアクセストークン     |
| `WAITER_SECRET`                             | true     |                                   | WAITER許可証トークン秘密鍵       |
| `WAITER_PASSPORT_ISSUER`                    | true     | https://kwskfs-waiter-example.com | WAITER許可証発行者           |
| `ORDER_INQUIRY_ENDPOINT`                    | true     |                                   | 注文照会エンドポイント            |
| `AWS_ACCESS_KEY_ID`                         | true     |                                   | AWSアクセスキー              |
| `AWS_SECRET_ACCESS_KEY`                     | true     |                                   | AWSシークレットアクセスキー        |
| `COGNITO_USER_POOL_ID`                      | true     |                                   | CognitoユーザープールID       |
| `BLUELAB_API_ENDPOINT`                      | true     |                                   | Bluelab APIエンドポイント     |
| `BLUELAB_API_KEY`                           | true     |                                   | Bluelab APIキー          |

### Search individual screening events sample

```js
const kwskfs = require('@motionpicture/kwskfs-domain');

kwskfs.mongoose.connect('MONGOLAB_URI');
const redisClient = kwskfs.redis.createClient({
    host: '*****',
    port: 6380,
    password: '*****',
    tls: { servername: 6380 }
});

const eventRepo = new kwskfs.repository.Event(kwskfs.mongoose.connection);
const itemAvailabilityRepo = new kwskfs.repository.itemAvailability.IndividualScreeningEvent(redisClient);

kwskfs.service.offer.searchIndividualScreeningEvents({
    superEventLocationIdentifiers:['MovieTheater-118'],
    startFrom: new Date(),
    startThrough: new Date(),
})({
    event: eventRepo,
    itemAvailability: itemAvailabilityRepo
})
    .then((events) => {
        console.log('events:', events);
    });
```

## Code Samples

Code sample are [here](https://github.com/motionpicture/kwskfs-domain/tree/master/example).

## Jsdoc

`npm run doc` emits jsdoc to ./doc.

## License

UNLICENSED
