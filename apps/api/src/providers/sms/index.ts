import { env } from "../../config/env.js";
import { KavenegarProvider } from "./KavenegarProvider.js";
import { MockSmsProvider } from "./MockSmsProvider.js";
import type { SmsProvider } from "./SmsProvider.js";

function createSmsProvider(): SmsProvider {
  if (env.SMS_PROVIDER === "kavenegar") {
    if (!env.KAVENEGAR_API_KEY || !env.OTP_TEMPLATE) {
      throw new Error(
        "KAVENEGAR_API_KEY and OTP_TEMPLATE are required when SMS_PROVIDER=kavenegar",
      );
    }
    return new KavenegarProvider(env.KAVENEGAR_API_KEY, env.OTP_TEMPLATE);
  }
  return new MockSmsProvider();
}

export const smsProvider: SmsProvider = createSmsProvider();
export type { SmsProvider } from "./SmsProvider.js";
