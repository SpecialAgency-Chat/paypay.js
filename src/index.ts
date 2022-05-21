import Axios from "axios";
import type { AxiosResponse, AxiosInstance } from "axios";

class PayPayError extends Error {
  public constructor(title: string, message: string) {
    super(`${message}`);
    this.name = this.constructor.name + ` [${title.toUpperCase()}]`;
  }
};

type If<T extends boolean, A, B = null> = T extends true ? A : T extends false ? B : A | B;

type PartialPartial<T extends object, K extends keyof T> = { [P in K]?: T[P] } & { [P in Exclude<keyof T, K>]-?: T[P] };

type PayPayResult<S extends string = string> = {
  header: {
    resultCode: S,
    resultMessage: string
  }
}

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
    this._logged = (this._accessToken ? true:false);
    this._axios = Axios.create({ validateStatus: () => true });
  }
  public async login(phoneNumber: string, password: string): Promise<{ readonly status: PayPayLoginStatus.DONE, accessToken: string, refreshToken: string } | { status: PayPayLoginStatus.OTP_REQUIRED, otpPrefix: string, otpReferenceId: string }> {
    const { data } = await this._axios.post<PartialPartial<PayPayLoginResult<boolean>, "error" | "payload">>("https://app3.paypay.ne.jp/bff/v1/signIn?payPayLang=ja", {
      phoneNumber,
      password
    }, {
      headers: {
        "Host": "app3.paypay.ne.jp",
        "Client-UUID": this.clientUuid,
        "System-Locale": "ja",
        "Device-UUID": this.deviceUuid,
        "Accept-Encoding": "gzip,deflate,br",
        "User-Agent": "PaypayApp/3.31.202202181001CFNetwork/1126Darwin/19.5.0",
        "Client-Version": "3.31.0",
        "Device-Name": "iPad8,3",
        "Content-Length": "74",
        "Connection": "keep-alive",
        "Client-OS-Type": "IOS",
        "Client-Mode": "NORMAL",
        "Client-Type": "PAYPAYAPP",
        "Accept-Language": "ja-jp",
        "Timezone": "Asia/Tokyo",
        "Content-Type": "application/json",
        "Accept": "*/*",
        "Client-OS-Version": "13.5.1",
        "Network-Status": "WIFI",
      } as const,
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
      "Host": "app3.paypay.ne.jp",
      "Client-UUID": this.clientUuid,
      "System-Locale": "ja",
      "Device-UUID": this.deviceUuid,
      "Accept-Encoding": "gzip,deflate,br",
      "User-Agent": "PaypayApp/3.31.202202181001CFNetwork/1126Darwin/19.5.0",
      "Client-Version": "3.31.0",
      "Device-Name": "iPad8,3",
      "Content-Length": "74",
      "Connection": "keep-alive",
      "Client-OS-Type": "IOS",
      "Client-Mode": "NORMAL",
      "Client-Type": "PAYPAYAPP",
      "Accept-Language": "ja-jp",
      "Timezone": "Asia/Tokyo",
      "Content-Type": "application/json",
      "Accept": "*/*",
      "Client-OS-Version": "13.5.1",
      "Network-Status": "WIFI",
    } as const;
    const { data } = await this._axios.post<PayPayResult<"S0000"> & { payload: { accessToken: string, refreshToken: string } }>("https://app3.paypay.ne.jp/bff/v1/signInWithSms?payPayLang=ja", {
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
  protected checkToken(): this is PayPay {
    return !!this._logged;
  }
  public async getBalance() {
    if (!this.checkToken()) throw new PayPayError("NOT_LOGGED", "access token has not set.");
    const { data } = await this._axios.get<PayPayBalanceResult>("https://app3.paypay.ne.jp/bff/v1/getBalanceInfo?includeKycInfo=false&includePending=false&includePendingBonusLite=false&noCache=true&payPayLang=ja", {
      headers: getHeader(this._accessToken!)
    });
    return {
      balance: data.payload.walletSummary.allTotalBalanceInfo.balance,
      balancePrepaid: data.payload.walletDetail.prepaidBalanceInfo?.balance,
      balanceCashback: data.payload.walletDetail.cashBackBalanceInfo?.balance
    }
  }
}

export { PayPay, PayPayError, PayPayLoginResult, PayPayLoginStatus, PayPayResult, PayPayBalanceResult };