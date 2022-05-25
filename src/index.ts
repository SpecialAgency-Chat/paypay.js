import Axios from "axios";
import type { AxiosResponse, AxiosInstance } from "axios";
import axios from "axios";
import moment from "moment-timezone";
import uuid from "uuid";

class PayPayError extends Error {
  public constructor(title: string, message: string) {
    super(`${message}`);
    this.name = this.constructor.name + ` [${title.toUpperCase()}]`;
  }
};

const tokenRevokedError = new PayPayError("TOKEN_REVOKED", "Access token has been revoked");
const tokenNotSetError = new PayPayError("TOKEN_NOT_SET", "Access token has not been set.");

type PartialPartial<T extends object, K extends keyof T> = { [P in K]?: T[P] } & { [P in Exclude<keyof T, K>]-?: T[P] };

type PayPayResult<S extends string = string, M extends string = ""> = {
  header: {
    resultCode: S,
    resultMessage: M
  }
}

type PayPayErrorResult = PayPayResult<"S0001"> & { error: {} }

type PayPayLoginResult<O extends boolean> = PayPayResult<O extends true ? "S0000" : "S1004"> & {
  payload: O extends true ? {
    accessToken: string,
    refreshToken: string
  } : never
  error: O extends false ? {
    otpPrefix: string,
    otpReferenceId: string
  } : never
}

type PayPayBalanceResult = PayPayResult<"S0000"> & {
  payload: {
    walletSummary: {
      allTotalBalanceInfo: {
        balance: number,
        currency: "JPY"
      },
      totalBalanceInfo: {
        balance: number,
        currency: "JPY"
      },
      transferableBalanceInfo: {
        balance: number,
        currency: "JPY"
      },
      payoutableBalanceInfo: {
        balance: number,
        currency: "JPY"
      }
    },
    walletDetail: {
      emoneyBalanceInfo: {
        balance: number,
        currency: "JPY",
        usable: boolean
      } | null,
      prepaidBalanceInfo: {
        balance: number,
        currency: "JPY",
        usable: boolean
      } | null,
      cashBackBalanceInfo: {
        balance: number,
        currency: "JPY",
        usable: boolean
      } | null,
      cashBackExpirableBalanceInfo: {
        balance: number,
        currency: "JPY",
        usable: boolean
      } | null,
      cashBackPendingInfo: {
        balance: number,
        currency: "JPY",
        usable: boolean
      } | null,
      cashBackPendingBonusLiteInfo: {
        balance: number,
        currency: "JPY",
        usable: boolean
      } | null,
      preAuthBalanceInfo: {
        balance: number,
        currency: "JPY",
        usable: boolean
      } | null,
    },
  }
}

type PayPayHistoryResult = PayPayResult<"S0000"> & {
  payload: {
    lastSequence: number,
    hasNextPage: true,
    paymentInfoList: { imageUrl: string, description: string, dateTime: `${number}-${string}-${string}T${string}:${string}:${string}Z`, totalAmount: number, orderType: "P2PRECEIVE" | "REFUND" | "TOPUP" | "CASHBACK" | "P2PSEND" | "ACQUIRING", orderStatus: string, orderId: string, amountList: { label: string, amount: number, details: { label: string, amount: number }[] }[], displayMethodInfoList: { paymentMethodId: number, paymentMethodType: string, walletInfo: object }[], statusLabelString: string, statusLabelColor: string, fundsTransferLicense: string, historyId: string }[]
  }
}

type PayPayExecuteLinkResult = PayPayResult<"S0000"> & {
  payload: {
    messageId: string,
    chatRoomId: string,
    requestId: string,
    orderId: string,
    orderStatus: string,
    link: `https://pay.paypay.ne.jp/${string}`,
    transActionAt: string,
    expiry: string
  }
};

const isSMSRequired = (data: Partial<PayPayLoginResult<boolean>>): data is PayPayLoginResult<false> => {
  return data.header?.resultCode === "S1004";
}

const getHeader = (accessToken: string) => {
  return {
    'User-Agent': 'PaypayApp/3.31.202202181001 CFNetwork/1126 Darwin/19.5.0',
    'Authorization': `Bearer ${accessToken}`,
    'Client-Type': 'PAYPAYAPP',
    'Client-OS-Type': 'IOS',
    'Client-Version': '3.31.0'
  } as const;
};

enum PayPayLoginStatus {
  DONE = 0,
  OTP_REQUIRED = 1
}

class PayPay {
  public clientUuid: string;
  public deviceUuid: string;
  private _accessToken?: string;
  private _logged: boolean;
  private readonly _axios: AxiosInstance
  public constructor(clientUuid: string, deviceUuid: string, accessToken?: string) {
    this.clientUuid = clientUuid;
    this.deviceUuid = deviceUuid;
    this._accessToken = accessToken;
    this._logged = (this._accessToken ? true : false);
    this._axios = Axios.create({ validateStatus: () => true });
  }
  static async getPayPayVersion() {
    const { data } = await axios.get<{ appId: number, bundleIdentifier: string, bundleVersion: string, externalVersionId: number }[]>("https://api.cokepokes.com/v-api/app/1435783608");
    return data.at(-1)?.bundleVersion
  }
  public async login(phoneNumber: string, password: string): Promise<{ readonly status: PayPayLoginStatus.DONE, accessToken: string, refreshToken: string } | { status: PayPayLoginStatus.OTP_REQUIRED, otpPrefix: string, otpReferenceId: string }> {
    const headers = {
      "Client-UUID": this.clientUuid,
      "Device-UUID": this.deviceUuid,
      "Client-Version": "3.31.0",
      "Device-Name": "iPad8,3",
      "Client-OS-Type": "IOS",
      "Client-Mode": "NORMAL",
      "Client-Type": "PAYPAYAPP",
      "Content-Type": "application/json",
      "Client-OS-Version": await PayPay.getPayPayVersion() || "13.3.1",
      "Network-Status": "WIFI",
    } as const;
    const { data } = await this._axios.post<PartialPartial<PayPayLoginResult<boolean>, "error" | "payload">>("https://app4.paypay.ne.jp/bff/v1/signIn?payPayLang=ja", {
      phoneNumber,
      password
    }, {
      headers,
    });
    if (isSMSRequired(data)) {
      return { status: PayPayLoginStatus.OTP_REQUIRED, otpPrefix: data.error.otpPrefix, otpReferenceId: data.error.otpReferenceId };
    }
    if (data.header.resultCode === "S0000") {
      this._logged = true;
      return { status: PayPayLoginStatus.DONE, accessToken: data.payload!.accessToken, refreshToken: data.payload!.refreshToken }
    }
    throw new PayPayError("INVALID_PASSWORD", "an invalid password provided.");
  }
  public async loginOtp(otpReferenceId: string, otp: string): Promise<{ readonly status: PayPayLoginStatus.DONE, accessToken: string, refreshToken: string }> {
    const headers = {
      "Client-UUID": this.clientUuid,
      "Device-UUID": this.deviceUuid,
      "Client-Version": "3.31.0",
      "Device-Name": "iPad8,3",
      "Client-OS-Type": "IOS",
      "Client-Mode": "NORMAL",
      "Client-Type": "PAYPAYAPP",
      "Content-Type": "application/json",
      "Client-OS-Version": await PayPay.getPayPayVersion() || "13.3.1",
      "Network-Status": "WIFI",
    } as const;
    const { data } = await this._axios.post<PayPayResult<"S0000"> & { payload: { accessToken: string, refreshToken: string } }>("https://app4.paypay.ne.jp/bff/v1/signInWithSms?payPayLang=ja", {
      otp, otpReferenceId
    }, {
      headers
    });
    if (data.header.resultCode === "S0000") {
      this._accessToken = data.payload.accessToken;
      this._logged = true;
      return { status: PayPayLoginStatus.DONE, accessToken: data.payload.accessToken, refreshToken: data.payload.refreshToken }
    }
    throw new PayPayError("OTP_INVALID", "an invalid otp code is provided.");
  }
  public get logged(): boolean {
    return this._logged;
  }
  protected checkToken(): boolean {
    return !!this._logged;
  }
  static isError(data: PayPayResult<string>): data is PayPayErrorResult {
    return data.header.resultCode === "S0001" && (data as any).error;
  }
  public async getBalance() {
    if (!this.checkToken()) throw tokenNotSetError;
    const { data } = await this._axios.get<PayPayBalanceResult | PayPayErrorResult>("https://app4.paypay.ne.jp/bff/v1/getBalanceInfo?includeKycInfo=false&includePending=false&includePendingBonusLite=false&noCache=true&payPayLang=ja", {
      headers: getHeader(this._accessToken!)
    });
    if (PayPay.isError(data)) throw tokenRevokedError;
    return {
      balance: data.payload.walletSummary.allTotalBalanceInfo.balance,
      balancePrepaid: data.payload.walletDetail.prepaidBalanceInfo?.balance,
      balanceCashback: data.payload.walletDetail.cashBackBalanceInfo?.balance
    }
  }
  public async getHistory() {
    if (!this.checkToken()) throw tokenNotSetError;
    const { data } = await this._axios.get<PayPayHistoryResult | PayPayErrorResult>("https://app4.paypay.ne.jp/bff/v2/getPay2BalanceHistory?pageSize=40&payPayLang=ja", {
      headers: getHeader(this._accessToken!)
    });
    if (PayPay.isError(data)) throw tokenRevokedError;
    return data.payload.paymentInfoList;
  }
  public async executeLink(amount: number) {
    if (!this.checkToken()) throw tokenNotSetError;
    const header = {
      "Client-UUID": this.clientUuid,
      "System-Locale": "ja",
      "Device-UUID": this.deviceUuid,
      "Client-Version": "3.31.0",
      "Device-Name": "iPad8,3",
      "Client-OS-Type": "IOS",
      "Client-Mode": "NORMAL",
      'Authorization': `Bearer ${this._accessToken}`,
      "Client-Type": "PAYPAYAPP",
      "Accept-Language": "ja-jp",
      "Content-Type": "application/json",
      "Client-OS-Version": "13.5.1",
      "Network-Status": "WIFI",
    } as const;
    const requestId = uuid.v4();
    const { data } = await this._axios.post<PayPayExecuteLinkResult | PayPayErrorResult>("https://app4.paypay.ne.jp/bff/v2/executeP2PSendMoneyLink?payPayLang=ja", {
      androidMinimumVersion: "2.55.0",
      requestAt: moment(new Date()).tz("Asia/Tokyo").format("YYYY-MM-DDTHH:mm:ss+0900"),
      theme: "default-sendmoney",
      amount: String(amount),
      iosMinimumVersion: "2.55.0",
      requestId,
    }, {
      headers: header
    });
    if (PayPay.isError(data)) throw tokenRevokedError;
    return data;
  }
}

export { PayPay, PayPayError, PayPayLoginResult, PayPayLoginStatus, PayPayResult, PayPayBalanceResult };