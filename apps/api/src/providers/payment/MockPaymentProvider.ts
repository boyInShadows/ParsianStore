import { nanoid } from "nanoid";
import { logger } from "../../config/logger.js";
import type {
  PaymentInitiateParams,
  PaymentInitiateResult,
  PaymentProvider,
  PaymentVerifyParams,
  PaymentVerifyResult,
} from "./PaymentProvider.js";

/** Default provider for Phases 2-8 (§4 manifest note) -- logs instead of
 * calling out, so local dev and CI never need a real Zarinpal account.
 * `initiate()`'s redirectUrl points straight back at the caller's own
 * callbackUrl with a successful Status already attached, simulating an
 * instant-approve gateway -- lets local dev/tests exercise the *whole*
 * initiate -> redirect -> verify round trip with zero network calls, the
 * same way MockSmsProvider lets local dev read the OTP directly instead
 * of receiving a real SMS. No failure simulation, same simplicity
 * MockSmsProvider already has (it doesn't simulate OTP failure either). */
export class MockPaymentProvider implements PaymentProvider {
  initiate(params: PaymentInitiateParams): Promise<PaymentInitiateResult> {
    const authority = `MOCK-${nanoid()}`;
    logger.info(
      { amountRial: params.amountRial, orderId: params.orderId, authority },
      "MockPaymentProvider: payment not processed for real, logged for local dev",
    );
    const redirectUrl = new URL(params.callbackUrl);
    redirectUrl.searchParams.set("Authority", authority);
    redirectUrl.searchParams.set("Status", "OK");
    return Promise.resolve({ authority, redirectUrl: redirectUrl.toString() });
  }

  verify(params: PaymentVerifyParams): Promise<PaymentVerifyResult> {
    const refId = `MOCK-REF-${nanoid()}`;
    logger.info(
      { authority: params.authority, refId },
      "MockPaymentProvider: verification not real, logged for local dev",
    );
    return Promise.resolve({ success: true, refId, raw: { mock: true } });
  }
}
