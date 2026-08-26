import {
  meResponseSchema,
  otpRequestResponseSchema,
  otpVerifyResponseSchema,
  updateProfileResponseSchema,
  type MeDto,
  type UpdateProfileInput,
} from "schemas";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type AuthActionResult<T> = { ok: true; data: T } | { ok: false; message: string };

const GENERIC_ERROR = "خطایی رخ داد، دوباره تلاش کنید";

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const json = (await res.json()) as { error?: { message?: string } };
    if (typeof json.error?.message === "string") return json.error.message;
  } catch {
    // fall through to the generic message
  }
  return GENERIC_ERROR;
}

// Client-side only. The httpOnly accessToken/refreshToken cookies
// auth.controller.ts sets are invisible to JS -- `credentials: "include"`
// is the only way these fetches can prove the session to the API, and
// these are the first client fetchers in this codebase to use it.

export async function fetchMe(): Promise<MeDto | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/auth/me`, { credentials: "include" });
    if (!res.ok) return null;
    const json = await res.json();
    const parsed = meResponseSchema.safeParse(json);
    return parsed.success ? parsed.data.data : null;
  } catch {
    return null;
  }
}

// Server-side only (P8.S1: the (admin) layout's own auth+role gate) --
// same cookie-forwarding reasoning fetchOrders/fetchWishlist already
// established: a Server Component fetch() has no browser cookie jar,
// unlike fetchMe() above's client-context credentials:"include".
export async function fetchMeServer(cookieHeader: string): Promise<MeDto | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/auth/me`, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await res.json();
    const parsed = meResponseSchema.safeParse(json);
    return parsed.success ? parsed.data.data : null;
  } catch {
    return null;
  }
}

export async function requestOtp(phone: string): Promise<AuthActionResult<{ message: string }>> {
  try {
    const res = await fetch(`${API_URL}/api/v1/auth/otp/request`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    if (!res.ok) return { ok: false, message: await readErrorMessage(res) };
    const json = await res.json();
    const parsed = otpRequestResponseSchema.safeParse(json);
    return parsed.success
      ? { ok: true, data: parsed.data.data }
      : { ok: false, message: GENERIC_ERROR };
  } catch {
    return { ok: false, message: GENERIC_ERROR };
  }
}

export async function verifyOtp(phone: string, code: string): Promise<AuthActionResult<MeDto>> {
  try {
    const res = await fetch(`${API_URL}/api/v1/auth/otp/verify`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, code }),
    });
    if (!res.ok) return { ok: false, message: await readErrorMessage(res) };
    const json = await res.json();
    const parsed = otpVerifyResponseSchema.safeParse(json);
    return parsed.success
      ? { ok: true, data: parsed.data.data }
      : { ok: false, message: GENERIC_ERROR };
  } catch {
    return { ok: false, message: GENERIC_ERROR };
  }
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

export async function updateProfile(input: UpdateProfileInput): Promise<AuthActionResult<MeDto>> {
  try {
    const res = await fetch(`${API_URL}/api/v1/auth/me`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) return { ok: false, message: await readErrorMessage(res) };
    const parsed = updateProfileResponseSchema.safeParse(await res.json());
    return parsed.success
      ? { ok: true, data: parsed.data.data }
      : { ok: false, message: GENERIC_ERROR };
  } catch {
    return { ok: false, message: GENERIC_ERROR };
  }
}
