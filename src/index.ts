import axios from "axios";
import { type AxiosResponse } from "axios";

class PayPayError extends Error {
  public constructor(title: string, message: string) {
    super(`[${title.toUpperCase()}] ${message}`);
    this.name = this.constructor.name;
  }
};

type PartialPartial<T extends object, K extends keyof T> = { [P in K]?: T[P] } & { [P in Exclude<keyof T, K>]-?: T[P]};

type PayPayLoginResult<O extends boolean> = {
  header: {
    resultCode: O extends true ? "S0000" : "S1004",
    resultMessage: string
  },
  payload: O extends true ? {
    accessToken: string,
    refreshToken: string
  }:never
  error: O extends false ? {
    otpPrefix: string,
    otpReferenceId: string
  }:never
}

const isSMSRequired = (data: Partial<PayPayLoginResult<boolean>>): data is PayPayLoginResult<false> => {
  return data.header?.resultCode === "S1004";
}

enum PayPayLoginStatus {
  DONE = 0,
  OTP_REQUIRED = 1
}

class PayPay<L extends boolean = false> {
  public clientUuid: string;
  public deviceUuid: string;
  private _logged: L;
  public constructor(clientUuid: string, deviceUuid: string) {
    this.clientUuid = clientUuid;
    this.deviceUuid = deviceUuid;
    this._logged = false as L;
  }
  public async login(phoneNumber: string, password: string): Promise<{ status: PayPayLoginStatus.DONE, accessToken: string, refreshToken: string } | { status: PayPayLoginStatus.OTP_REQUIRED, otpPrefix: string, otpReferenceId: string }> {
    const { data } = await axios.post<PartialPartial<PayPayLoginResult<boolean>, "error" | "payload">>("https://app3.paypay.ne.jp/bff/v1/signIn?payPayLang=ja", {
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
      },
      validateStatus: () => true
    });
    if (isSMSRequired(data)) {
      return { status: PayPayLoginStatus.OTP_REQUIRED, otpPrefix: data.error.otpPrefix, otpReferenceId: data.error.otpReferenceId };
    }
    return { status: PayPayLoginStatus.DONE, accessToken: data.payload!.accessToken, refreshToken: data.payload!.refreshToken }
  }
}
