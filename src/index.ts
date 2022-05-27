import Axios from "axios";
import type { AxiosResponse, AxiosInstance } from "axios";
import axios from "axios";
import moment from "moment-timezone";
import * as uuid from "uuid";

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

type PartialPartial<T extends object, K extends keyof T> = {
  [P in K]?: T[P];
} & { [P in Exclude<keyof T, K>]-?: T[P] };

type PayPayResult<S extends string = string, M extends string = ""> = {
  header: {
    resultCode: S;
    resultMessage: M;
  };
};

type PayPayErrorResult<C extends string = "S0001"> = PayPayResult<C> & { error: {} };

type PayPayLoginResult<O extends boolean> = PayPayResult<
  O extends true ? "S0000" : "S1004"
> & {
  payload: O extends true
  ? {
    accessToken: string;
    refreshToken: string;
  }
  : never;
  error: O extends false
  ? {
    otpPrefix: string;
    otpReferenceId: string;
  }
  : never;
};

type PayPayBalanceResult = PayPayResult<"S0000"> & {
  payload: {
    walletSummary: {
      allTotalBalanceInfo: {
        balance: number;
        currency: "JPY";
      };
      totalBalanceInfo: {
        balance: number;
        currency: "JPY";
      };
      transferableBalanceInfo: {
        balance: number;
        currency: "JPY";
      };
      payoutableBalanceInfo: {
        balance: number;
        currency: "JPY";
      };
    };
    walletDetail: {
      emoneyBalanceInfo: {
        balance: number;
        currency: "JPY";
        usable: boolean;
      } | null;
      prepaidBalanceInfo: {
        balance: number;
        currency: "JPY";
        usable: boolean;
      } | null;
      cashBackBalanceInfo: {
        balance: number;
        currency: "JPY";
        usable: boolean;
      } | null;
      cashBackExpirableBalanceInfo: {
        balance: number;
        currency: "JPY";
        usable: boolean;
      } | null;
      cashBackPendingInfo: {
        balance: number;
        currency: "JPY";
        usable: boolean;
      } | null;
      cashBackPendingBonusLiteInfo: {
        balance: number;
        currency: "JPY";
        usable: boolean;
      } | null;
      preAuthBalanceInfo: {
        balance: number;
        currency: "JPY";
        usable: boolean;
      } | null;
    };
  };
};

type PayPayHistoryResult = PayPayResult<"S0000"> & {
  payload: {
    lastSequence: number;
    hasNextPage: true;
    paymentInfoList: {
      imageUrl: string;
      description: string;
      dateTime: `${number}-${string}-${string}T${string}:${string}:${string}Z`;
      totalAmount: number;
      orderType:
      | "P2PRECEIVE"
      | "REFUND"
      | "TOPUP"
      | "CASHBACK"
      | "P2PSEND"
      | "ACQUIRING";
      orderStatus: string;
      orderId: string;
      amountList: {
        label: string;
        amount: number;
        details: { label: string; amount: number }[];
      }[];
      displayMethodInfoList: {
        paymentMethodId: number;
        paymentMethodType: string;
        walletInfo: object;
      }[];
      statusLabelString: string;
      statusLabelColor: string;
      fundsTransferLicense: string;
      historyId: string;
    }[];
  };
};

type PayPayExecuteLinkResult = PayPayResult<"S0000"> & {
  payload: {
    messageId: string;
    chatRoomId: string;
    requestId: string;
    orderId: string;
    orderStatus: string;
    link: `https://pay.paypay.ne.jp/${string}`;
    transActionAt: string;
    expiry: string;
  };
};

type PayPayUser = {
  externalId: string;
  displayName: string;
  photoUrl: string;
};

type PayPayLinkTheme = {
  id: string;
  iconImageUrl: string;
  thumbnailAnimationUrl: string;
  backgroundAnimationUrl: string;
  isShowDarkBackground: boolean;
};

type PayPayGoogleAnalyticsInfo = {
  eventCategory: string,
  eventAction: string
}

type PayPayProfileGroupItem = {
  id: string,
  iconImageUrl: string,
  title: string,
  description: string | null,
  statusText: string | null,
  tappableCount: number,
  deeplink: PayPayDeepLink,
  googleAnalyticsInfo: PayPayGoogleAnalyticsInfo,

}

type PayPayDeepLink = `paypay://${string}`;

type PayPayUserProfile = {
  avatarImageUrl: string | null,
  externalUserId: string,
  displayName: string | null,
  nickName: string | null,
  lastName: string | null,
  firstName: string | null,
  lastNameKana: string | null,
  firstNameKana: string | null,
  lastNameRomaji: string | null,
  firstNameRomaji: string | null,
  gender: unknown,
  payPayIdInfo: unknown,
  phoneNumber: string,
  searchablePhoneNumber: true,
  mailAddress: string | null,
  changeableMailAddress: boolean,
  notificationType: unknown,
  isAuthorizedMailAddress: boolean,
  emailPendingVerificationInfo: unknown,
  isPushNotification: boolean,
  isMerchantStore: boolean,
  isAlreadySetPassword: boolean,
  isAlreadySetPasscode: boolean,
  isAlreadyLinkYconnect: boolean,
  isAlreadyLinkSoftbank: boolean,
  isAlreadySetAddress: boolean,
  linkStatus: object,
  hasWallet: boolean,
  isPremium: boolean,
  isUsingYmobile: boolean,
  enableSmartLogin: boolean,
  ymoneyMigrated: boolean,
  kycInfo: object,
  userScoreInfo: object,
  isDeletableAccount: boolean
}

type PayPayProfile = {
  myIconList: {
    id: string,
    position: number,
    type: string,
    imageUrl: string,
    labelShort: string,
    labelLong: string,
    deeplinkUrl: PayPayDeepLink,
    googleAnalyticsInfo: PayPayGoogleAnalyticsInfo
  }[],
  profileGroupList: {
    title: string | null,
    itemList: PayPayProfileGroupItem
  }[],
  userProfile: PayPayUserProfile
}

type PayPayProfileResult = PayPayResult<"S0000"> & { payload: PayPayProfile };

type PayPayLinkInfo = PayPayResult<"S0000"> & {
  payload: {
    pendingP2PInfo: {
      orderId: string;
      orderType:
      | "P2PRECEIVE"
      | "REFUND"
      | "TOPUP"
      | "CASHBACK"
      | "P2PSEND"
      | "ACQUIRING";
      description: string;
      imageUrl: string;
      amount: number;
      link: `https://pay.paypay.ne.jp/${string}`;
      isSetPasscode: boolean;
      createdAt: string;
      expiredAt: string;
    };
    orderStatus: "PENDING" | "SUCCESS" | "REJECTED" | "EXPIRED";
    sender: PayPayUser;
    receiver: PayPayUser;
    message: {
      messageId: string;
      messageType: string;
      customType: string;
      message: string;
      chatRoomId: string;
      user: PayPayUser;
      isRemoved: boolean;
      iosMinimumVersion: string;
      androidMinimumVersion: string;
      data: {
        type: string;
        isLink: boolean;
        requestId: string;
        requestMoneyId: string | null;
        orderId: string;
        transactionAt: string;
        expiry: string;
        status: string;
        amount: number;
        theme: PayPayLinkTheme;
        isQr: boolean | null;
        subWalletSplit: {
          senderEmoneyAmount: number;
          senderPrepaidAmount: number;
          receiverEmoneyAmount: number;
          receiverPrepaidAmount: number;
        };
        sendMoneyLink: `https://pay.paypay.ne.jp/${string}`;
        sendMoneyLinkPasscode: string | null;
        sender: PayPayUser;
        createdAt: string;
        updatedAt: string;
      };
      createdAt: string;
      updatedAt: string;
    };
  };
};

enum PayPayLoginStatus {
  DONE = 0,
  OTP_REQUIRED = 1,
}

type PayPayConstructorOptions = {
  accessToken?: string;
  clientUuid?: string;
  deviceUuid?: string;
};

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
  static getHeader(accessToken: string) {
    return {
      "User-Agent": "PaypayApp/3.31.202202181001 CFNetwork/1126 Darwin/19.5.0",
      Authorization: `Bearer ${accessToken}`,
      "Client-Type": "PAYPAYAPP",
      "Client-OS-Type": "IOS",
      "Client-Version": "3.31.0",
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
      status: PayPayLoginStatus.OTP_REQUIRED;
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
      "Client-Version": "3.31.0",
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
    const { data } = await this._axios.post(
      `https://${this._host}/bff/v2/acceptP2PSendMoneyLink?payPayLang=ja`,
      sendData,
      {
        headers: {
          'Host': this._host,
          'Client-Version': await PayPay.getPayPayVersion() as string,
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
    if (PayPay.isError(data)) throw tokenNotSetError;
    return data;
  }
}

export {
  PayPay,
  PayPayError,
  PayPayLoginResult,
  PayPayLoginStatus,
  PayPayResult,
  PayPayBalanceResult,
  PayPayConstructorOptions,
  PayPayErrorResult,
  PayPayExecuteLinkResult,
  PayPayHistoryResult,
  PayPayLinkInfo,
  PayPayLinkTheme,
  PayPayUser
};
