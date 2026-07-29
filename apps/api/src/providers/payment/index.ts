import { env } from "../../config/env.js";
import { MockPaymentProvider } from "./MockPaymentProvider.js";
import type { PaymentProvider } from "./PaymentProvider.js";
import { ZarinpalProvider } from "./ZarinpalProvider.js";

function createPaymentProvider(): PaymentProvider {
  if (env.PAYMENT_PROVIDER === "zarinpal") {
    if (!env.ZARINPAL_MERCHANT_ID) {
      throw new Error("ZARINPAL_MERCHANT_ID is required when PAYMENT_PROVIDER=zarinpal");
    }
    return new ZarinpalProvider(env.ZARINPAL_MERCHANT_ID, env.ZARINPAL_SANDBOX);
  }
  return new MockPaymentProvider();
}

export const paymentProvider: PaymentProvider = createPaymentProvider();
export type {
  PaymentInitiateParams,
  PaymentInitiateResult,
  PaymentProvider,
  PaymentVerifyParams,
  PaymentVerifyResult,
} from "./PaymentProvider.js";
