/**
 * Bluelabサービス
 */
import * as request from 'request-promise-native';

export interface IProcessPaymentParams {
    accessToken: string;
    paymentAmount: number;
    paymentMethodID: string;
    beneficiaryAccountInformation: {
        branchNumber: string;
        accountNumber: string;
        accountName: string;
    };
    paymentDetailsList: any;
}

export interface IProcessPaymentResult {
    statusCode: number;
    body: {
        resultsList: {
            remittanceId: string;
            remittanceAt: string;
            reckonDt: string;
            settlementAmount: number;
            availableAmount: number;
        };
    };
}

export interface IOpenAccountParams {
    accessToken: string;
}

export interface IOpenAccountResult {
    statusCode: number;
    body: {
        status: string;
        registInfo: {
            paymentMethodId: string;
            bluelabToken: string;
        };
    };
}

/**
 * Bluelab(みずほ銀行APIへのゲートウェイ)サービス
 */
export class BluelabService {
    private endpoint: string;
    private apiKey: string;

    constructor(params: { endpoint: string; apiKey: string }) {
        this.endpoint = params.endpoint;
        this.apiKey = params.apiKey;
    }

    /**
     * Bluelab決済プロセス
     */
    public async processPayment(params: IProcessPaymentParams): Promise<IProcessPaymentResult> {
        const response = await request.post({
            url: `${this.endpoint}/dev/payment/purchase`,
            headers: {
                bluelabToken: params.accessToken,
                'x-api-key': this.apiKey
            },
            body: {
                paymentAmount: params.paymentAmount,
                paymentMethodID: params.paymentMethodID,
                beneficiaryAccountInformation: {
                    branchNumber: params.beneficiaryAccountInformation.branchNumber,
                    accountNumber: params.beneficiaryAccountInformation.accountNumber,
                    accountName: params.beneficiaryAccountInformation.accountName
                },
                paymentDetailsList: params.paymentDetailsList
            },
            json: true,
            simple: false,
            resolveWithFullResponse: true
        }).promise();

        return {
            statusCode: response.statusCode,
            body: response.body
        };
    }

    /**
     * 口座開設プロセス
     */
    public async openAccount(params: IOpenAccountParams): Promise<IOpenAccountResult> {
        const response = await request.post({
            url: `${this.endpoint}/dev/accountRegistration`,
            headers: {
                bluelabToken: params.accessToken,
                'x-api-key': this.apiKey
            },
            body: {
                paymentInformation: {
                    paymentMethod: 'bankAPI(mizuho)',
                    paymentInstitute: 'mizuhoBank',
                    accountInformation: {
                        branchNumber: '015',
                        accountNumber: '1011000',
                        accountName: 'ﾂｷｼﾞﾀﾛｳ'
                    }
                }
            },
            json: true,
            simple: false,
            resolveWithFullResponse: true
        }).promise();

        return {
            statusCode: response.statusCode,
            body: response.body
        };
    }
}
