import Axios from "axios";
import type { AxiosResponse, AxiosInstance } from "axios";
import axios from "axios";
import moment from "moment-timezone";
import * as uuid from "uuid";
import { PayPayConstructorOptions, PayPayLoginResult, PayPayLoginStatus, PartialPartial, PayPayResult, PayPayErrorResult, PayPayBalanceResult, PayPayHistoryResult, PayPayExecuteLinkResult, PayPayLinkInfo, PayPayProfileResult, PayPayAcceptLinkResult } from "./types";

class PayPayError extends Error {
  public constructor(title: string, message: string) {
    super(`${message}`);
    this.name = this.constructor.name + ` [${title.toUpperCase()}]`;
  }
}

const tokenRevokedError = new PayPayError(
  "TOKEN_REVOKED",
  "Access token has been revoked"
);
const tokenNotSetError = new PayPayError(
  "TOKEN_NOT_SET",
  "Access token has not been set."
);

class PayPay {
  public clientUuid: string;
  public deviceUuid: string;
  private _accessToken?: string;
  private _logged: boolean;
  private readonly _axios: AxiosInstance;
  private _version: string;
  private readonly _host = "app4.paypay.ne.jp";
  public constructor(options?: PayPayConstructorOptions) {
    this.clientUuid = options?.clientUuid || uuid.v4().toUpperCase();
    this.deviceUuid = options?.deviceUuid || uuid.v4().toUpperCase();
    this._accessToken = options?.accessToken;
    this._logged = this._accessToken ? true : false;
    this._axios = Axios.create({ validateStatus: () => true });
    this._version = "3.41.1";
    this._setPayPayVersion();
  }
  static async getPayPayVersion() {
    const { data } = await axios.get<
      {
        appId: number;
        bundleIdentifier: string;
        bundleVersion: string;
        externalVersionId: number;
      }[]
    >("https://api.cokepokes.com/v-api/app/1435783608");
    return data.at(-1)?.bundleVersion;
  }
  private async _setPayPayVersion() {
    const v = await PayPay.getPayPayVersion();
    this._version = v!;
  }
  static isSMSRequired(
    data: Partial<PayPayLoginResult<boolean>>
  ): data is PayPayLoginResult<false> {
    return data.header?.resultCode === "S1004";
  }
  static getHeader(accessToken: string, options?: Omit<PayPayConstructorOptions, "accessToken">) {
    return {
      "User-Agent": "PaypayApp/3.31.202202181001 CFNetwork/1126 Darwin/19.5.0",
      Authorization: `Bearer ${accessToken}`,
      "Client-Type": "PAYPAYAPP",
      "Client-OS-Type": "IOS",
      "Client-Version": "3.31.0",
      "Client-OS-Version": "13.3.1",
      "Client-UUID": options?.clientUuid || uuid.v4().toUpperCase(),
      "Device-UUID": options?.deviceUuid || uuid.v4().toUpperCase(),
      "Device-Name": "iPad8,3",
      "Network-Status": "WIFI",
      "Content-Type": "application/json",
    } as const;
  }
  public async login(
    phoneNumber: string,
    password: string
  ): Promise<
    | {
      readonly status: PayPayLoginStatus.DONE;
      accessToken: string;
      refreshToken: string;
    }
    | {
      readonly status: PayPayLoginStatus.OTP_REQUIRED;
      otpPrefix: string;
      otpReferenceId: string;
    }
  > {
    const headers = {
      "Client-UUID": this.clientUuid,
      "Device-UUID": this.deviceUuid,
      "Client-Version": "3.31.0",
      "Device-Name": "iPad8,3",
      "Client-OS-Type": "IOS",
      "Client-Mode": "NORMAL",
      "Client-Type": "PAYPAYAPP",
      "Content-Type": "application/json",
      "Client-OS-Version": (await PayPay.getPayPayVersion()) || "13.3.1",
      "Network-Status": "WIFI",
    } as const;
    const { data } = await this._axios.post<
      PartialPartial<PayPayLoginResult<boolean>, "error" | "payload">
    >(
      `https://${this._host}/bff/v1/signIn?payPayLang=ja`,
      {
        phoneNumber,
        password,
      },
      {
        headers,
      }
    );
    if (PayPay.isSMSRequired(data)) {
      return {
        status: PayPayLoginStatus.OTP_REQUIRED,
        otpPrefix: data.error.otpPrefix,
        otpReferenceId: data.error.otpReferenceId,
      };
    }
    if (data.header.resultCode === "S0000") {
      this._logged = true;
      return {
        status: PayPayLoginStatus.DONE,
        accessToken: data.payload!.accessToken,
        refreshToken: data.payload!.refreshToken,
      };
    }
    throw new PayPayError("INVALID_PASSWORD", "an invalid password provided.");
  }
  public async loginOtp(
    otpReferenceId: string,
    otp: string
  ): Promise<{
    readonly status: PayPayLoginStatus.DONE;
    accessToken: string;
    refreshToken: string;
  }> {
    const headers = {
      "Client-UUID": this.clientUuid,
      "Device-UUID": this.deviceUuid,
      "Client-Version": await PayPay.getPayPayVersion() || "3.31.0",
      "Device-Name": "iPad8,3",
      "Client-OS-Type": "IOS",
      "Client-Mode": "NORMAL",
      "Client-Type": "PAYPAYAPP",
      "Content-Type": "application/json",
      "Client-OS-Version": "13.3.1",
      "Network-Status": "WIFI",
    } as const;
    const { data } = await this._axios.post<
      PayPayResult<"S0000"> & {
        payload: { accessToken: string; refreshToken: string };
      }
    >(
      `https://${this._host}/bff/v1/signInWithSms?payPayLang=ja`,
      {
        otp,
        otpReferenceId,
      },
      {
        headers,
      }
    );
    if (data.header.resultCode === "S0000") {
      this._accessToken = data.payload.accessToken;
      this._logged = true;
      return {
        status: PayPayLoginStatus.DONE,
        accessToken: data.payload.accessToken,
        refreshToken: data.payload.refreshToken,
      };
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
    const { data } = await this._axios.get<
      PayPayBalanceResult | PayPayErrorResult
    >(
      `https://${this._host}/bff/v1/getBalanceInfo?includeKycInfo=false&includePending=false&includePendingBonusLite=false&noCache=true&payPayLang=ja`,
      {
        headers: PayPay.getHeader(this._accessToken!),
      }
    );
    if (PayPay.isError(data)) throw tokenRevokedError;
    return {
      balance: data.payload.walletSummary.allTotalBalanceInfo.balance,
      balancePrepaid: data.payload.walletDetail.prepaidBalanceInfo?.balance,
      balanceCashback: data.payload.walletDetail.cashBackBalanceInfo?.balance,
    };
  }
  public async getHistory() {
    if (!this.checkToken()) throw tokenNotSetError;
    const { data } = await this._axios.get<
      PayPayHistoryResult | PayPayErrorResult
    >(
      `https://${this._host}/bff/v2/getPay2BalanceHistory?pageSize=40&payPayLang=ja`,
      {
        headers: PayPay.getHeader(this._accessToken!),
      }
    );
    if (PayPay.isError(data)) throw tokenRevokedError;
    return data.payload.paymentInfoList;
  }
  public async executeLink(amount: number) {
    if (!this.checkToken()) throw tokenNotSetError;
    const header = {
      "Client-UUID": this.clientUuid,
      "System-Locale": "ja",
      "Device-UUID": this.deviceUuid,
      "Client-Version": await PayPay.getPayPayVersion() || "13.3.1",
      "Device-Name": "iPad8,3",
      "Client-OS-Type": "IOS",
      "Client-Mode": "NORMAL",
      Authorization: `Bearer ${this._accessToken}`,
      "Client-Type": "PAYPAYAPP",
      "Accept-Language": "ja-jp",
      "Content-Type": "application/json",
      "Client-OS-Version": "13.5.1",
      "Network-Status": "WIFI",
    } as const;
    const requestId = uuid.v4().toUpperCase();
    const { data } = await this._axios.post<
      PayPayExecuteLinkResult | PayPayErrorResult
    >(
      `https://${this._host}/bff/v2/executeP2PSendMoneyLink?payPayLang=ja`,
      {
        androidMinimumVersion: "2.55.0",
        requestAt: moment(new Date())
          .tz("Asia/Tokyo")
          .format("YYYY-MM-DDTHH:mm:ss+0900"),
        theme: "default-sendmoney",
        amount: String(amount),
        iosMinimumVersion: "2.55.0",
        requestId,
      },
      {
        headers: header,
      }
    );
    if (PayPay.isError(data)) throw tokenRevokedError;
    return data;
  }
  public async getLinkInfo(code: string) {
    if (!this.checkToken()) throw tokenNotSetError;
    const { data } = await this._axios.get<PayPayLinkInfo | PayPayErrorResult>(
      `https://${this._host}/bff/v2/getP2PLinkInfo?payPayLang=ja&verificationCode=${code}`,
      {
        headers: PayPay.getHeader(this._accessToken!),
      }
    );
    if (PayPay.isError(data)) throw tokenRevokedError;
    return data;
  }
  public async acceptLink(code: string, passcode?: string) {
    if (!this.checkToken()) throw tokenNotSetError;
    const linkData = await this.getLinkInfo(code);
    if (linkData.payload.orderStatus !== "PENDING")
      throw new PayPayError(
        "LINK_STATUS_INVALID",
        "the link is not pending: " + linkData.payload.orderStatus
      );
    let sendData;
    if (linkData.payload.pendingP2PInfo.isSetPasscode) {
      if (!passcode)
        throw new PayPayError(
          "LINK_PASSCODE_REQUIRED",
          "the link requires a passcode"
        );
      sendData = {
        verificationCode: code,
        passcode: passcode,
        requestId: uuid.v4().toUpperCase(),
        requestAt: moment(new Date())
          .tz("Asia/Tokyo")
          .format("YYYY-MM-DDTHH:mm:ss+0900"),
        iosMinimumVersion: "2.55.0",
        androidMinimumVersion: "2.55.0",
        orderId: linkData.payload.message.data.orderId,
        senderChannelUrl: linkData.payload.message.chatRoomId,
        senderMessageId: linkData.payload.message.messageId,
      };
    } else {
      sendData = {
        verificationCode: code,
        requestId: uuid.v4().toUpperCase(),
        requestAt: moment(new Date())
          .tz("Asia/Tokyo")
          .format("YYYY-MM-DDTHH:mm:ss+0900"),
        iosMinimumVersion: "2.55.0",
        androidMinimumVersion: "2.55.0",
        orderId: linkData.payload.message.data.orderId,
        senderChannelUrl: linkData.payload.message.chatRoomId,
        senderMessageId: linkData.payload.message.messageId,
      }
    }
    const { data } = await this._axios.post<PayPayAcceptLinkResult | PayPayErrorResult>(
      `https://${this._host}/bff/v2/acceptP2PSendMoneyLink?payPayLang=ja`,
      sendData,
      {
        headers: {
          'Host': this._host,
          'Client-Version': await PayPay.getPayPayVersion() || '3.31.0',
          'Device-Uuid': this.deviceUuid,
          'System-Locale': 'ja',
          'User-Agent': 'PaypayApp/3.41.202205170207 CFNetwork/1126 Darwin/19.5.0',
          'Network-Status': 'WIFI',
          'Device-Name': 'iPhone9,1',
          'Client-Os-Type': 'IOS',
          'Client-Mode': 'NORMAL',
          'Client-Type': 'PAYPAYAPP',
          'Accept-Language': 'ja-jp',
          'Timezone': 'Asia/Tokyo',
          'Accept': '*/*',
          'Client-Uuid': this.clientUuid,
          'Client-Os-Version': '13.5.0',
          "Authorization": `Bearer ${this._accessToken}`,
        },
      }
    );
    if (PayPay.isError(data)) throw tokenRevokedError;
    if (data.header.resultCode !== "S0000") throw new PayPayError("UNKNOWN_ERROR", data.header.resultMessage);
    return data;
  };
  public async getProfile() {
    if (!this.checkToken()) throw tokenNotSetError;
    const { data } = await axios.get<PayPayProfileResult | PayPayErrorResult>(`https://${this._host}/bff/v2/getProfileDisplayInfo`, {
      headers: PayPay.getHeader(this._accessToken!)
    });
    if (PayPay.isError(data)) throw tokenRevokedError;
    return data;
  }
  public async executeMoney(amount: number, externalReceiverId: string) {
    if (!this.checkToken()) throw tokenNotSetError;
    const { data } = await axios.post<any | PayPayErrorResult>(`https://${this._host}/bff/v2/executeP2PSendMoney`, {
      amount,
      externalReceiverId,
      requestAt: moment(new Date())
        .tz("Asia/Tokyo")
        .format("YYYY-MM-DDTHH:mm:ss+0900"),
      requestId: uuid.v4().toUpperCase(),
      iosMinimumVersion: "2.55.0",
      androidMinimumVersion: "2.55.0",
      theme: "default-sendmoney",
    }, {
      headers: PayPay.getHeader(this._accessToken!)
    });
    if (PayPay.isError(data)) throw tokenRevokedError;
    return data;
  }
}

export { PayPay };