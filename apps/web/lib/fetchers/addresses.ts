import { addressListResponseSchema, addressResponseSchema, type AddressDto } from "schemas";
import { API_URL, apiAction, apiFetch, jsonBody, type ActionResult } from "@/lib/api-fetch";

export type AddressActionResult<T> = ActionResult<T>;

// Client-side only, credentials:"include" -- /me/addresses is
// requireAuth-gated (P6.S2), same session cookie every other /me/*
// fetcher already relies on. First real frontend consumer of this
// endpoint (P6.S6's checkout address picker) -- P6.S2 shipped
// backend-only.

export async function fetchAddresses(): Promise<AddressDto[] | null> {
  const res = await apiFetch(`${API_URL}/api/v1/me/addresses`, addressListResponseSchema, {
    credentials: "include",
  });
  return res.ok ? res.data.data : null;
}

export async function fetchAddressesServer(cookieHeader: string): Promise<AddressDto[] | null> {
  const res = await apiFetch(`${API_URL}/api/v1/me/addresses`, addressListResponseSchema, {
    headers: { cookie: cookieHeader },
    cache: "no-store",
  });
  return res.ok ? res.data.data : null;
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

export function createAddress(input: CreateAddressInput): Promise<AddressActionResult<AddressDto>> {
  return apiAction(`${API_URL}/api/v1/me/addresses`, addressResponseSchema, {
    method: "POST",
    credentials: "include",
    ...jsonBody(input),
  });
}

// P7.S2 -- the address book page is the first real consumer of
// PATCH/DELETE; checkout's own picker (P6.S6) only ever needed
// list+create.
export function updateAddress(
  id: string,
  input: CreateAddressInput,
): Promise<AddressActionResult<AddressDto>> {
  return apiAction(`${API_URL}/api/v1/me/addresses/${id}`, addressResponseSchema, {
    method: "PATCH",
    credentials: "include",
    ...jsonBody(input),
  });
}

export async function deleteAddress(id: string): Promise<AddressActionResult<{ id: string }>> {
  const res = await apiAction(`${API_URL}/api/v1/me/addresses/${id}`, null, {
    method: "DELETE",
    credentials: "include",
  });
  return res.ok ? { ok: true, data: { id } } : res;
}
