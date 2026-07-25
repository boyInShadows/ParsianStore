import { ApiError } from "../../utils/ApiError.js";
import type { SmsProvider } from "./SmsProvider.js";

/**
 * Kavenegar's Verify Lookup API (https://kavenegar.com) sends a templated
 * SMS carrying `code` as the `%token%` placeholder. Uses a plain `fetch`
 * call rather than the `kavenegar` npm SDK — that package isn't in the
 * dependency manifest (§4 only lists the env vars for it), and a single
 * GET request doesn't justify adding an unapproved dependency for it.
 */
export class KavenegarProvider implements SmsProvider {
  constructor(
    private readonly apiKey: string,
    private readonly template: string,
  ) {}

  async sendOtp(phone: string, code: string): Promise<void> {
    const url = new URL(`https://api.kavenegar.com/v1/${this.apiKey}/verify/lookup.json`);
    url.searchParams.set("receptor", phone);
    url.searchParams.set("token", code);
    url.searchParams.set("template", this.template);

    const response = await fetch(url);
    if (!response.ok) {
      throw new ApiError(502, "ارسال پیامک کد تایید ناموفق بود");
    }
  }
}
