import argon2 from "argon2";
import { nanoid } from "nanoid";
import { normalizePhone } from "schemas";
import type { MeDto } from "schemas";
import { env } from "../../config/env.js";
import { prisma } from "../../config/prisma.js";
import { smsProvider, type SmsProvider } from "../../providers/sms/index.js";
import { ApiError } from "../../utils/ApiError.js";
import { generateOtpCode } from "../../utils/otp.js";
import { hashToken, parseDurationMs } from "../../utils/token.js";
import { signAccessToken } from "../../utils/jwt.js";
import type { ProfileUpdateInput } from "./auth.schema.js";

const OTP_TTL_MS = 120_000;
const OTP_MAX_ATTEMPTS = 5;

/**
 * The columns every auth response is built from -- never the whole row.
 *
 * `passwordHash` was `select: false` on the Mongoose schema, so a query that
 * forgot about it could not leak it. Prisma returns every scalar unless a
 * `select` says otherwise, which makes this narrowing the only thing standing
 * between the staff password hash and `GET /auth/me`. Same reasoning as
 * catalog/pricing.ts and the wholesale price.
 */
const ME_COLUMNS = {
  id: true,
  phone: true,
  name: true,
  email: true,
  role: true,
  accountType: true,
} as const;

interface MeRow {
  id: string;
  phone: string;
  name: string;
  email: string | null;
  role: MeDto["role"];
  accountType: MeDto["accountType"];
}

/** A null column, an absent key: the wire shape has always had `email`
 * optional rather than nullable, and meSchema in packages/schemas says so. */
export function toMeDto(row: MeRow): MeDto {
  return {
    id: row.id,
    phone: row.phone,
    name: row.name,
    ...(row.email ? { email: row.email } : {}),
    role: row.role,
    accountType: row.accountType,
  };
}

export async function requestOtp(
  rawPhone: string,
  provider: SmsProvider = smsProvider,
): Promise<void> {
  const phone = normalizePhone(rawPhone);
  const code = generateOtpCode();
  const codeHash = await argon2.hash(code);

  // Only one active OTP per phone at a time — otherwise verify() would
  // have to guess which of several outstanding codes the user means.
  await prisma.otpToken.deleteMany({ where: { phone, purpose: "login" } });
  await prisma.otpToken.create({
    data: {
      phone,
      codeHash,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
      attempts: 0,
      purpose: "login",
    },
  });

  await provider.sendOtp(phone, code);
}

export interface AuthSession {
  user: MeDto;
  accessToken: string;
  refreshToken: string;
}

async function issueSession(
  user: MeRow & { isActive: boolean },
  userAgent?: string,
): Promise<AuthSession> {
  const accessToken = signAccessToken({
    sub: user.id,
    role: user.role,
    accountType: user.accountType,
  });

  const rawRefreshToken = nanoid(48);
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(rawRefreshToken),
      expiresAt: new Date(Date.now() + parseDurationMs(env.JWT_REFRESH_TTL)),
      userAgent: userAgent ?? null,
      revokedAt: null,
    },
  });

  return { user: toMeDto(user), accessToken, refreshToken: rawRefreshToken };
}

export async function verifyOtp(
  rawPhone: string,
  code: string,
  userAgent?: string,
): Promise<AuthSession> {
  const phone = normalizePhone(rawPhone);
  const otp = await prisma.otpToken.findFirst({ where: { phone, purpose: "login" } });

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
    // `increment` rather than read-modify-write: two verify attempts racing
    // on the same code would each have read `attempts` before either wrote,
    // and the counter would land one short of the truth. Mongoose's
    // `otp.attempts += 1; save()` had exactly that hole.
    await prisma.otpToken.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });
    throw new ApiError(400, "کد تایید نادرست است");
  }

  // Consumed — a code is single-use regardless of remaining TTL.
  await prisma.otpToken.delete({ where: { id: otp.id } });

  const existing = await prisma.user.findUnique({
    where: { phone },
    select: { ...ME_COLUMNS, isActive: true },
  });
  if (existing) {
    await prisma.user.update({ where: { id: existing.id }, data: { lastLoginAt: new Date() } });
    return issueSession(existing, userAgent);
  }

  // The lookup above cannot see a soft-deleted account (the extension filters
  // it out), and `phone` is unique, so creating one here would hit the
  // constraint and surface as a 500. Under Mongo it did exactly that. Saying
  // so is both kinder and truthful; silently reviving a deleted account is
  // not this endpoint's decision to make.
  const tombstoned = await prisma.user.findFirst({
    where: { phone, deletedAt: { not: null } },
    select: { id: true },
  });
  if (tombstoned) {
    throw new ApiError(403, "این حساب غیرفعال شده است، با پشتیبانی تماس بگیرید");
  }

  // §3.3.4: first successful verification auto-creates the account.
  const created = await prisma.user.create({
    data: { phone, name: phone, role: "customer", lastLoginAt: new Date() },
    select: { ...ME_COLUMNS, isActive: true },
  });
  return issueSession(created, userAgent);
}

export async function refreshSession(
  rawRefreshToken: string,
  userAgent?: string,
): Promise<AuthSession> {
  const tokenHash = hashToken(rawRefreshToken);
  const existing = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  if (!existing || existing.revokedAt !== null || existing.expiresAt.getTime() < Date.now()) {
    throw new ApiError(401, "نشست شما منقضی شده است، دوباره وارد شوید");
  }

  // Rotation: this refresh token is single-use. Revoking it here (rather
  // than deleting) keeps a record for reuse detection if it's ever
  // presented again — a signal worth acting on later, not yet in scope.
  await prisma.refreshToken.update({
    where: { id: existing.id },
    data: { revokedAt: new Date() },
  });

  const user = await prisma.user.findUnique({
    where: { id: existing.userId },
    select: { ...ME_COLUMNS, isActive: true },
  });
  if (!user || !user.isActive) {
    throw new ApiError(401, "کاربر یافت نشد یا غیرفعال است");
  }

  return issueSession(user, userAgent);
}

export async function logout(rawRefreshToken: string): Promise<void> {
  const tokenHash = hashToken(rawRefreshToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function getUserById(userId: string): Promise<MeDto> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: ME_COLUMNS });
  if (!user) {
    throw new ApiError(404, "کاربر یافت نشد");
  }
  return toMeDto(user);
}

export async function updateProfile(userId: string, input: ProfileUpdateInput): Promise<MeDto> {
  const existing = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!existing) {
    throw new ApiError(404, "کاربر یافت نشد");
  }
  // An empty string clears the address rather than storing "": the input
  // schema accepts `""` precisely so a customer can remove an email they
  // once gave, and a nullable column is how "no email" is spelled here.
  const user = await prisma.user.update({
    where: { id: userId },
    data: { name: input.name, email: input.email || null },
    select: ME_COLUMNS,
  });
  return toMeDto(user);
}
