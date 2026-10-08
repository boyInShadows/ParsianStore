/**
 * The one fetch -> res.ok -> JSON -> validate -> catch block every
 * `lib/fetchers/*` module used to repeat by hand.
 *
 * Deliberately imports nothing at the value level: the session-path
 * fetchers (auth/cart/wishlist) mount on every shop route and must stay
 * zod-free (see `lib/shape-guard.ts` and `no-zod-in-session-path.test.ts`,
 * which guards this file too). Zod response schemas from `schemas` satisfy
 * `Validator` structurally, and so does `{ safeParse: someHandWrittenGuard }`.
 */

// On the server (SSR, server actions) API_INTERNAL_URL wins when set, so the
// web container reaches the api over the compose network (`http://api:4000`)
// instead of going out through public DNS and the reverse proxy and back in.
// The browser never sees it: it is not NEXT_PUBLIC_, and the window check
// keeps client code on the public origin.
export const API_URL =
  (typeof window === "undefined" && process.env.API_INTERNAL_URL) ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:4000";

export const GENERIC_ERROR = "خطایی رخ داد، دوباره تلاش کنید";

export type ActionResult<T> = { ok: true; data: T } | { ok: false; message: string };

/** Structural stand-in for a Zod schema -- `zod` is not a dependency of apps/web. */
export type Validator<T> = {
  safeParse: (input: unknown) => { success: true; data: T } | { success: false };
};

/**
 * `res` is present only for a non-2xx response, with its body still unread,
 * so callers can branch on `res.status` or read the API's error message.
 * It is absent for a network failure, an unparseable body, or a body that
 * failed validation.
 */
export type ApiOutcome<T> = { ok: true; data: T } | { ok: false; res?: Response };

/** Never throws. Pass `null` as the validator when the body is not read. */
export async function apiFetch<T>(
  url: string,
  schema: Validator<T>,
  init?: RequestInit,
): Promise<ApiOutcome<T>>;
export async function apiFetch(
  url: string,
  schema: null,
  init?: RequestInit,
): Promise<ApiOutcome<null>>;
export async function apiFetch<T>(
  url: string,
  schema: Validator<T> | null,
  init?: RequestInit,
): Promise<ApiOutcome<T | null>>;
export async function apiFetch<T>(
  url: string,
  schema: Validator<T> | null,
  init?: RequestInit,
): Promise<ApiOutcome<T | null>> {
  try {
    const res = await fetch(url, init);
    if (!res.ok) return { ok: false, res };
    if (!schema) return { ok: true, data: null };
    const parsed = schema.safeParse(await res.json());
    return parsed.success ? { ok: true, data: parsed.data } : { ok: false };
  } catch {
    return { ok: false };
  }
}

/** The API's own (Persian) error message for a non-2xx response, else the generic one. */
export async function failureMessage(outcome: { res?: Response }): Promise<string> {
  if (!outcome.res) return GENERIC_ERROR;
  try {
    const json = (await outcome.res.json()) as { error?: { message?: string } };
    if (typeof json.error?.message === "string") return json.error.message;
  } catch {
    // fall through to the generic message
  }
  return GENERIC_ERROR;
}

/**
 * fetch -> `{ ok: true, data: envelope.data }` or `{ ok: false, message }`.
 * With a `null` validator the body is never read and success is `data: null`.
 */
export async function apiAction<T>(
  url: string,
  schema: Validator<{ data: T }>,
  init?: RequestInit,
): Promise<ActionResult<T>>;
export async function apiAction(
  url: string,
  schema: null,
  init?: RequestInit,
): Promise<ActionResult<null>>;
export async function apiAction<T>(
  url: string,
  schema: Validator<{ data: T }> | null,
  init?: RequestInit,
): Promise<ActionResult<T | null>>;
export async function apiAction<T>(
  url: string,
  schema: Validator<{ data: T }> | null,
  init?: RequestInit,
): Promise<ActionResult<T | null>> {
  const outcome = await apiFetch(url, schema, init);
  if (!outcome.ok) return { ok: false, message: await failureMessage(outcome) };
  return { ok: true, data: outcome.data === null ? null : outcome.data.data };
}

/** JSON request body plus the headers it needs. */
export function jsonBody(body: unknown): Pick<RequestInit, "headers" | "body"> {
  return { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

type PagedEnvelope<T> = { data: T[]; meta: { total: number; page: number; limit: number } };

/** `{ data, meta }` list envelope -> the flat page shape every list screen consumes. */
export function toPage<T>(envelope: PagedEnvelope<T>): {
  data: T[];
  total: number;
  page: number;
  limit: number;
} {
  const { total, page, limit } = envelope.meta;
  return { data: envelope.data, total, page, limit };
}
