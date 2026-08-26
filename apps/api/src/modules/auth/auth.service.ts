import argon2 from "argon2";
import { nanoid } from "nanoid";
import { normalizePhone } from "schemas";
import { env } from "../../config/env.js";
import { OtpTokenModel } from "../../models/OtpToken.js";
import { RefreshTokenModel } from "../../models/RefreshToken.js";
import { UserModel, type User } from "../../models/User.js";
import { smsProvider, type SmsProvider } from "../../providers/sms/index.js";
import { ApiError } from "../../utils/ApiError.js";
import { generateOtpCode } from "../../utils/otp.js";
import { hashToken, parseDurationMs } from "../../utils/token.js";
import { signAccessToken } from "../../utils/jwt.js";
import type { HydratedDocument } from "mongoose";
import type { ProfileUpdateInput } from "./auth.schema.js";

const OTP_TTL_MS = 120_000;
const OTP_MAX_ATTEMPTS = 5;

export async function requestOtp(
  rawPhone: string,
  provider: SmsProvider = smsProvider,
): Promise<void> {
  const phone = normalizePhone(rawPhone);
  const code = generateOtpCode();
  const codeHash = await argon2.hash(code);

  // Only one active OTP per phone at a time — otherwise verify() would
  // have to guess which of several outstanding codes the user means.
  await OtpTokenModel.deleteMany({ phone, purpose: "login" });
  await OtpTokenModel.create({
    phone,
    codeHash,
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
    attempts: 0,
    purpose: "login",
  });

  await provider.sendOtp(phone, code);
}

export interface AuthSession {
  user: HydratedDocument<User>;
  accessToken: string;
  refreshToken: string;
}

async function issueSession(
  user: HydratedDocument<User>,
  userAgent?: string,
): Promise<AuthSession> {
  const accessToken = signAccessToken({
    sub: user.id as string,
    role: user.role,
    accountType: user.accountType,
  });

  const rawRefreshToken = nanoid(48);
  await RefreshTokenModel.create({
    userId: user._id,
    tokenHash: hashToken(rawRefreshToken),
    expiresAt: new Date(Date.now() + parseDurationMs(env.JWT_REFRESH_TTL)),
    userAgent,
    revokedAt: null,
  });

  return { user, accessToken, refreshToken: rawRefreshToken };
}

export async function verifyOtp(
  rawPhone: string,
  code: string,
  userAgent?: string,
): Promise<AuthSession> {
  const phone = normalizePhone(rawPhone);
  const otp = await OtpTokenModel.findOne({ phone, purpose: "login" });

  if (!otp) {
    throw new ApiError(400, "کد تایید یافت نشد، دوباره درخواست دهید");
  }
  if (otp.expiresAt.getTime() < Date.now()) {
    throw new ApiError(400, "کد تایید منقضی شده است");
  }
  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    throw new ApiError(429, "تعداد تلاش‌های مجاز به پایان رسیده است، دوباره درخواست دهید");
  }

  const isValid = await argon2.verify(otp.codeHash, code);
  if (!isValid) {
    otp.attempts += 1;
    await otp.save();
    throw new ApiError(400, "کد تایید نادرست است");
  }

  // Consumed — a code is single-use regardless of remaining TTL.
  await OtpTokenModel.deleteOne({ _id: otp._id });

  let user = await UserModel.findOne({ phone });
  if (!user) {
    // §3.3.4: first successful verification auto-creates the account.
    user = await UserModel.create({ phone, name: phone, role: "customer" });
  }
  user.lastLoginAt = new Date();
  await user.save();

  return issueSession(user, userAgent);
}

export async function refreshSession(
  rawRefreshToken: string,
  userAgent?: string,
): Promise<AuthSession> {
  const tokenHash = hashToken(rawRefreshToken);
  const existing = await RefreshTokenModel.findOne({ tokenHash });

  if (!existing || existing.revokedAt !== null || existing.expiresAt.getTime() < Date.now()) {
    throw new ApiError(401, "نشست شما منقضی شده است، دوباره وارد شوید");
  }

  // Rotation: this refresh token is single-use. Revoking it here (rather
  // than deleting) keeps a record for reuse detection if it's ever
  // presented again — a signal worth acting on later, not yet in scope.
  existing.revokedAt = new Date();
  await existing.save();

  const user = await UserModel.findById(existing.userId);
  if (!user || !user.isActive) {
    throw new ApiError(401, "کاربر یافت نشد یا غیرفعال است");
  }

  return issueSession(user, userAgent);
}

export async function logout(rawRefreshToken: string): Promise<void> {
  const tokenHash = hashToken(rawRefreshToken);
  await RefreshTokenModel.updateOne({ tokenHash, revokedAt: null }, { revokedAt: new Date() });
}

export async function getUserById(userId: string): Promise<HydratedDocument<User>> {
  const user = await UserModel.findById(userId);
  if (!user) {
    throw new ApiError(404, "کاربر یافت نشد");
  }
  return user;
}

export async function updateProfile(
  userId: string,
  input: ProfileUpdateInput,
): Promise<HydratedDocument<User>> {
  const user = await UserModel.findById(userId);
  if (!user) {
    throw new ApiError(404, "کاربر یافت نشد");
  }
  user.name = input.name;
  user.email = input.email || undefined;
  await user.save();
  return user;
}
