import { z } from "zod";

// §3.3: "validate /^(\+98|0098|0)?9\d{9}$/ → normalize to E.164". This
// checks acceptance shape; normalizePhone() (packages/schemas) does the
// actual normalization once a value passes this gate.
const phoneField = z.string().regex(/^(\+98|0098|0)?9\d{9}$/, "شماره موبایل معتبر نیست");

export const otpRequestSchema = z.object({
  phone: phoneField,
});
export type OtpRequestInput = z.infer<typeof otpRequestSchema>;

export const otpVerifySchema = z.object({
  phone: phoneField,
  code: z.string().length(6, "کد تایید باید ۶ رقم باشد"),
});
export type OtpVerifyInput = z.infer<typeof otpVerifySchema>;
