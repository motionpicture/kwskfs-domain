/**
 * 電話番号フォーマットサンプル
 * @ignore
 */

const googleLibphonenumber = require('google-libphonenumber');

const phoneUtil = googleLibphonenumber.PhoneNumberUtil.getInstance();
const phoneNumber = phoneUtil.parse('+819012345678', 'JP');
console.log(phoneUtil.format(phoneNumber, googleLibphonenumber.PhoneNumberFormat.E164));
console.log(phoneUtil.format(phoneNumber, googleLibphonenumber.PhoneNumberFormat.INTERNATIONAL));
console.log(phoneUtil.format(phoneNumber, googleLibphonenumber.PhoneNumberFormat.NATIONAL));
console.log(phoneUtil.format(phoneNumber, googleLibphonenumber.PhoneNumberFormat.RFC3966));
console.log(phoneUtil.format(phoneNumber, googleLibphonenumber.PhoneNumberFormat.NATIONAL).replace(/[^\d]/g, ''));
