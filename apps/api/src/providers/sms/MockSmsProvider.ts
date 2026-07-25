import { logger } from "../../config/logger.js";
import type { SmsProvider } from "./SmsProvider.js";

/** Default provider for Phases 2-8 (§4 manifest note) — logs instead of
 * sending, so local dev and CI never need a real SMS account. */
export class MockSmsProvider implements SmsProvider {
  sendOtp(phone: string, code: string): Promise<void> {
    logger.info({ phone, code }, "MockSmsProvider: OTP not sent for real, logged for local dev");
    return Promise.resolve();
  }
}
