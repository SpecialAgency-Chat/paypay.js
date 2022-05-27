# PayPay.js

> Unofficial PayPay client

## How to Use

### Login

```ts
// CommonJS
const { PayPay } = require("paypay.js");

// ESM or TypeScript
import { PayPay } from "paypay.js";

const paypay = new PayPay();
await paypay.login("09012345678", "password");
```
