import type { MeDto, UpdateProfileInput } from "schemas";
import { API_URL, apiAction, apiFetch, jsonBody, type ActionResult } from "@/lib/api-fetch";
import { isOneOf, isOptionalString, isPlainObject, isString } from "@/lib/shape-guard";

// P15.S8b: hand-written shape guards replacing zod's safeParse -- see
// lib/shape-guard.ts's own comment for why. `AuthSession` mounts on every
// shop route, so this module's zod cost (meResponseSchema and friends)
// was paid on every route, not just the login/account flows that use
// requestOtp/verifyOtp/updateProfile.
const ROLES = ["customer", "support", "operator", "admin", "superadmin"] as const;
const ACCOUNT_TYPES = ["retail", "wholesale"] as const;

function guardMe(value: unknown): value is MeDto {
  return (
    isPlainObject(value) &&
    isString(value.id) &&
    isString(value.phone) &&
    isString(value.name) &&
    isOptionalString(value.email) &&
    isOneOf(value.role, ROLES) &&
    isOneOf(value.accountType, ACCOUNT_TYPES)
  );
}

// Mirrors meResponseSchema/otpVerifyResponseSchema/updateProfileResponseSchema
// (all three are the same `{ ok: true, data: MeDto }` envelope in
// packages/schemas/src/auth.ts).
const meResponse = {
  safeParse(json: unknown): { success: true; data: { data: MeDto } } | { success: false } {
    if (isPlainObject(json) && json.ok === true && guardMe(json.data)) {
      return { success: true, data: { data: json.data } };
    }
    return { success: false };
  },
};

const otpRequestResponse = {
  safeParse(
    json: unknown,
  ): { success: true; data: { data: { message: string } } } | { success: false } {
    if (
      isPlainObject(json) &&
      json.ok === true &&
      isPlainObject(json.data) &&
      isString(json.data.message)
    ) {
      return { success: true, data: { data: { message: json.data.message } } };
    }
    return { success: false };
  },
};

export type AuthActionResult<T> = ActionResult<T>;

// Client-side only. The httpOnly accessToken/refreshToken cookies
// auth.controller.ts sets are invisible to JS -- `credentials: "include"`
// is the only way these fetches can prove the session to the API, and
// these are the first client fetchers in this codebase to use it.

export async function fetchMe(): Promise<MeDto | null> {
  const res = await apiFetch(`${API_URL}/api/v1/auth/me`, meResponse, { credentials: "include" });
  return res.ok ? res.data.data : null;
}

// Server-side only (P8.S1: the (admin) layout's own auth+role gate) --
// same cookie-forwarding reasoning fetchOrders/fetchWishlist already
// established: a Server Component fetch() has no browser cookie jar,
// unlike fetchMe() above's client-context credentials:"include".
export async function fetchMeServer(cookieHeader: string): Promise<MeDto | null> {
  const res = await apiFetch(`${API_URL}/api/v1/auth/me`, meResponse, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });
  return res.ok ? res.data.data : null;
}

export function requestOtp(phone: string): Promise<AuthActionResult<{ message: string }>> {
  return apiAction(`${API_URL}/api/v1/auth/otp/request`, otpRequestResponse, {
    method: "POST",
    credentials: "include",
    ...jsonBody({ phone }),
  });
}

export function verifyOtp(phone: string, code: string): Promise<AuthActionResult<MeDto>> {
  return apiAction(`${API_URL}/api/v1/auth/otp/verify`, meResponse, {
    method: "POST",
    credentials: "include",
    ...jsonBody({ phone, code }),
  });
}

export async function logout(): Promise<void> {
  try {
    await fetch(`${API_URL}/api/v1/auth/logout`, { method: "POST", credentials: "include" });
  } catch {
    // Best-effort -- clearing the client-side auth store (caller's job) is
    // what actually matters for the UI; a failed network call here
    // shouldn't block that.
  }
}

export function updateProfile(input: UpdateProfileInput): Promise<AuthActionResult<MeDto>> {
  return apiAction(`${API_URL}/api/v1/auth/me`, meResponse, {
    method: "PATCH",
    credentials: "include",
    ...jsonBody(input),
  });
}
