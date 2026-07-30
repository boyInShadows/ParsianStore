import { ApiError } from "../../utils/ApiError.js";
import type {
  PaymentInitiateParams,
  PaymentInitiateResult,
  PaymentProvider,
  PaymentVerifyParams,
  PaymentVerifyResult,
} from "./PaymentProvider.js";

const PRODUCTION_BASE = "https://payment.zarinpal.com";
const SANDBOX_BASE = "https://sandbox.zarinpal.com";

interface ZarinpalRequestResponse {
  data?: { code?: number; authority?: string };
  errors?: unknown;
}

interface ZarinpalVerifyResponse {
  data?: { code?: number; ref_id?: number };
  errors?: unknown;
}

// Real Zarinpal v4 REST API (verified against zarinpal.com's own docs,
// not assumed). Native fetch, no SDK -- same reasoning KavenegarProvider
// already gives: this codebase has no HTTP client dependency at all, and
// a couple of JSON POSTs don't justify adding one.
export class ZarinpalProvider implements PaymentProvider {
  constructor(
    private readonly merchantId: string,
    private readonly sandbox: boolean,
  ) {}

  private get baseUrl(): string {
    return this.sandbox ? SANDBOX_BASE : PRODUCTION_BASE;
  }

  async initiate(params: PaymentInitiateParams): Promise<PaymentInitiateResult> {
    const response = await fetch(`${this.baseUrl}/pg/v4/payment/request.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        merchant_id: this.merchantId,
        amount: params.amountRial,
        // Always explicit -- this codebase's entire money model is
        // Rial-only (CLAUDE.md rule 8), never leave this to Zarinpal's
        // own default and risk an ambiguous 10x amount error.
        currency: "IRR",
        callback_url: params.callbackUrl,
        description: params.description,
        metadata: {
          mobile: params.mobile,
          email: params.email,
          order_id: params.orderId,
        },
      }),
    });
    if (!response.ok) {
      throw new ApiError(502, "درخواست پرداخت زرین‌پال ناموفق بود");
    }
    const json = (await response.json()) as ZarinpalRequestResponse;
    // Zarinpal's own envelope can report a failure inside a 2xx response.
    if (json.data?.code !== 100 || !json.data.authority) {
      throw new ApiError(502, "درخواست پرداخت زرین‌پال ناموفق بود");
    }
    const authority = json.data.authority;
    return { authority, redirectUrl: `${this.baseUrl}/pg/StartPay/${authority}` };
  }

  async verify(params: PaymentVerifyParams): Promise<PaymentVerifyResult> {
    const response = await fetch(`${this.baseUrl}/pg/v4/payment/verify.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        merchant_id: this.merchantId,
        amount: params.amountRial,
        authority: params.authority,
      }),
    });
    if (!response.ok) {
      throw new ApiError(502, "تایید پرداخت زرین‌پال ناموفق بود");
    }
    const json = (await response.json()) as ZarinpalVerifyResponse;
    // 100 = first verify, 101 = already verified (e.g. a duplicate
    // callback/webhook firing twice) -- both are a real success, not an
    // error. Anything else is a genuine business-level decline/failure,
    // not a transport error, so this returns rather than throws --
    // verify() is inherently a "check the outcome" call.
    const success = json.data?.code === 100 || json.data?.code === 101;
    return {
      success,
      refId: json.data?.ref_id != null ? String(json.data.ref_id) : undefined,
      raw: json,
    };
  }
}
