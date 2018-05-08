/**
 * 会員連絡先サービス
 */
import * as factory from '@motionpicture/kwskfs-factory';
import * as AWS from 'aws-sdk';
import * as createDebug from 'debug';
import { PhoneNumberFormat, PhoneNumberUtil } from 'google-libphonenumber';

const debug = createDebug('kwskfs-domain:service:person:contact');

/**
 * Cognitoからユーザープロフィールを取得する
 * @param accessToken アクセストークン
 * @see https://docs.aws.amazon.com/cognito/latest/developerguide/limits.html APIにはいくつかの制限があるので考慮すること
 */
export function retrieve(accessToken: string) {
    return async (): Promise<factory.person.IContact> => {
        let contact: factory.person.IContact;

        try {
            contact = await new Promise<factory.person.IContact>((resolve, reject) => {
                const cognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider({
                    apiVersion: 'latest',
                    region: 'ap-northeast-1'
                });

                cognitoIdentityServiceProvider.getUser(
                    {
                        AccessToken: accessToken
                    },
                    (err, data) => {
                        if (err instanceof Error) {
                            reject(err);
                        } else {
                            debug('cognito getUserResponse:', data);
                            const contactFromAttributes: factory.person.IContact = {
                                givenName: '',
                                familyName: '',
                                email: '',
                                telephone: ''
                            };

                            data.UserAttributes.forEach((userAttribute) => {
                                switch (userAttribute.Name) {
                                    case 'given_name':
                                        contactFromAttributes.givenName = (userAttribute.Value !== undefined) ? userAttribute.Value : '';
                                        break;
                                    case 'family_name':
                                        contactFromAttributes.familyName = (userAttribute.Value !== undefined) ? userAttribute.Value : '';
                                        break;
                                    case 'email':
                                        contactFromAttributes.email = (userAttribute.Value !== undefined) ? userAttribute.Value : '';
                                        break;
                                    case 'phone_number':
                                        contactFromAttributes.telephone = (userAttribute.Value !== undefined) ? userAttribute.Value : '';
                                        break;
                                    default:
                                }

                            });

                            resolve(contactFromAttributes);
                        }
                    });
            });
        } catch (error) {
            // AmazonCognitoAPIのレート制限をハンドリング
            if (error.name === 'TooManyRequestsException') {
                throw new factory.errors.RateLimitExceeded(`getUser ${error.message}`);
            } else {
                throw new factory.errors.Argument('accessToken', `${error.name}:${error.message}`);
            }
        }

        return contact;
    };
}

/**
 * 会員プロフィール更新
 */
export function update(
    accessToken: string,
    contact: factory.person.IContact
) {
    return async () => {
        return new Promise<void>((resolve, reject) => {
            let formatedPhoneNumber: string;
            try {
                const phoneUtil = PhoneNumberUtil.getInstance();
                const phoneNumber = phoneUtil.parse(contact.telephone, 'JP');
                debug('isValidNumber:', phoneUtil.isValidNumber(phoneNumber));
                if (!phoneUtil.isValidNumber(phoneNumber)) {
                    throw new Error('Invalid phone number format.');
                }

                formatedPhoneNumber = phoneUtil.format(phoneNumber, PhoneNumberFormat.E164);
            } catch (error) {
                reject(new factory.errors.Argument('telephone', 'invalid phone number format'));

                return;
            }

            const cognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider({
                apiVersion: 'latest',
                region: 'ap-northeast-1'
            });

            cognitoIdentityServiceProvider.updateUserAttributes(
                {
                    AccessToken: accessToken,
                    UserAttributes: [
                        {
                            Name: 'given_name',
                            Value: contact.givenName
                        },
                        {
                            Name: 'family_name',
                            Value: contact.familyName
                        },
                        {
                            Name: 'phone_number',
                            Value: formatedPhoneNumber
                        },
                        {
                            Name: 'email',
                            Value: contact.email
                        }
                    ]
                },
                (err) => {
                    if (err instanceof Error) {
                        reject(new factory.errors.Argument('contact', err.message));
                    } else {
                        resolve();
                    }
                });
        });
    };
}
