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

export {
  PayPayBalanceResult,
  PayPayConstructorOptions,
  PayPayDeepLink,
  PayPayErrorResult,
  PayPayExecuteLinkResult,
  PayPayGoogleAnalyticsInfo,
  PayPayHistoryResult,
  PayPayLinkInfo,
  PayPayLinkTheme,
  PayPayLoginResult,
  PayPayLoginStatus,
  PayPayProfile,
  PayPayProfileGroupItem,
  PayPayProfileResult,
  PayPayResult,
  PayPayUser,
  PayPayUserProfile,
  PartialPartial
}