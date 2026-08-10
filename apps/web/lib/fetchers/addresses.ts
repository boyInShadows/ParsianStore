import { addressListResponseSchema, addressResponseSchema, type AddressDto } from "schemas";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type AddressActionResult<T> = { ok: true; data: T } | { ok: false; message: string };

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

// Client-side only, credentials:"include" -- /me/addresses is
// requireAuth-gated (P6.S2), same session cookie every other /me/*
// fetcher already relies on. First real frontend consumer of this
// endpoint (P6.S6's checkout address picker) -- P6.S2 shipped
// backend-only.

export async function fetchAddresses(): Promise<AddressDto[] | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/me/addresses`, { credentials: "include" });
    if (!res.ok) return null;
    const json = await res.json();
    const parsed = addressListResponseSchema.safeParse(json);
    return parsed.success ? parsed.data.data : null;
  } catch {
    return null;
  }
}

export async function fetchAddressesServer(cookieHeader: string): Promise<AddressDto[] | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/me/addresses`, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const parsed = addressListResponseSchema.safeParse(await res.json());
    return parsed.success ? parsed.data.data : null;
  } catch {
    return null;
  }
}

// Matches addresses.schema.ts's addressInputSchema shape (server-side
// only, per its own comment) -- the server is the real validator
// (normalizePhone/normalizePostalCode transforms happen there), this is
// just the wire shape the form submits.
export interface CreateAddressInput {
  provinceId: string;
  cityId: string;
  line: string;
  postalCode: string;
  plate?: string;
  unit?: string;
  receiverName: string;
  receiverPhone: string;
}

export async function createAddress(
  input: CreateAddressInput,
): Promise<AddressActionResult<AddressDto>> {
  try {
    const res = await fetch(`${API_URL}/api/v1/me/addresses`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) return { ok: false, message: await readErrorMessage(res) };
    const json = await res.json();
    const parsed = addressResponseSchema.safeParse(json);
    return parsed.success
      ? { ok: true, data: parsed.data.data }
      : { ok: false, message: GENERIC_ERROR };
  } catch {
    return { ok: false, message: GENERIC_ERROR };
  }
}

// P7.S2 -- the address book page is the first real consumer of
// PATCH/DELETE; checkout's own picker (P6.S6) only ever needed
// list+create.
export async function updateAddress(
  id: string,
  input: CreateAddressInput,
): Promise<AddressActionResult<AddressDto>> {
  try {
    const res = await fetch(`${API_URL}/api/v1/me/addresses/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) return { ok: false, message: await readErrorMessage(res) };
    const json = await res.json();
    const parsed = addressResponseSchema.safeParse(json);
    return parsed.success
      ? { ok: true, data: parsed.data.data }
      : { ok: false, message: GENERIC_ERROR };
  } catch {
    return { ok: false, message: GENERIC_ERROR };
  }
}

export async function deleteAddress(id: string): Promise<AddressActionResult<{ id: string }>> {
  try {
    const res = await fetch(`${API_URL}/api/v1/me/addresses/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) return { ok: false, message: await readErrorMessage(res) };
    return { ok: true, data: { id } };
  } catch {
    return { ok: false, message: GENERIC_ERROR };
  }
}
