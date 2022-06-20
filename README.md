# PayPay.js

[![npm](https://img.shields.io/npm/v/paypay.js)](https://npmjs.com/package/paypay.js)
![node version](https://img.shields.io/node/v/paypay.js)
![keywords](https://img.shields.io/github/package-json/keywords/SpecialAgency-Chat/paypay.js)

> Unofficial PayPay client

## Features

- Login
- Get balance
- Get History
- Accept Link
- Create Link
- Send Money
- Get Account Info

## How to Use

### Login

```ts
// CommonJS
const { PayPay, PayPayLoginStatus } = require("paypay.js");
const { createInterface } = require("readline");

// ESM or TypeScript
import { PayPay, PayPayLoginStatus } from "paypay.js";
import { createInterface } from "readline";

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
})

const paypay = new PayPay();
const loginResult = await paypay.login("09012345678", "password");

if (loginResult.status === PayPayLoginStatus.DONE) {
  console.log("Logged in!");
  console.log(`Your access Token: ${loginResult.accessToken}`);
} else if (loginResult.status === PayPayLoginStatus.OTP_REQUIRED) {
  console.log("OTP Required");
  rl.question(`Enter otp code: ${loginResult.otpPrefix}-`, async (answer) => {
    const otpResult = await paypay.loginOtp(loginResult.otpReferenceId, answer);
    console.log("Logged in!");
    console.log(`Your access Token: ${otpResult.accessToken}`);
  })
}
```

### Another feature

```ts
const paypay = new PayPay({ accessToken: "YOUR_ACCESS_TOKEN" });
console.log(await paypay.getBalance()); // get balance
console.log(await paypay.getHistory()); // get history
console.log(await paypay.getLinkInfo("L1nKc0dE")); // get send money link info
console.log(await paypay.acceptLink("L1nKc0dE")); // accept link
console.log(await paypay.executeLink(100)); // create 100 yen link
```
