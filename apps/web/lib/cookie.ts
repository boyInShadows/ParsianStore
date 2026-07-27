// Plain document.cookie read/write -- masterPlan.md §4's dependency
// manifest has no client-side cookie library (cookie-parser is apps/api
// only, for httpOnly auth cookies), and this is intentionally NOT
// httpOnly: masterPlan.md §3.4's guest garage must be readable/writable
// by client JS directly.
export function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  const raw = match?.[1];
  return raw !== undefined ? decodeURIComponent(raw) : undefined;
}

const ONE_YEAR_DAYS = 365;

export function setCookie(name: string, value: string, days: number = ONE_YEAR_DAYS): void {
  if (typeof document === "undefined") return;
  const maxAge = days * 24 * 60 * 60;
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax${secure}`;
}

export function removeCookie(name: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; path=/; max-age=0`;
}
