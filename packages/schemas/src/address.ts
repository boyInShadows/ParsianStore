import { z } from "zod";

// Mirrors apps/api's GET/POST/PATCH/DELETE /me/addresses (P6.S2) -- same
// "apps/api has no Zod schema for its own responses" reasoning as
// products.ts/wishlist.ts. The request/input validation schema (with the
// normalizePhone/normalizePostalCode transforms) lives server-side only,
// in apps/api/src/modules/addresses/addresses.schema.ts -- same split
// cart.schema.ts (input) / cart.ts (response) already established.
const localizedNameSchema = z.object({ fa: z.string(), en: z.string() });

// The hydrated shape the API actually returns -- province/city resolved
// to their real name/slug via a separate query (never `.populate()`,
// same convention as products.ts's brandRefSchema/categoryRefSchema),
// never just the raw ids.
const provinceRefSchema = z.object({ id: z.string(), name: localizedNameSchema, slug: z.string() });
const cityRefSchema = z.object({ id: z.string(), name: localizedNameSchema, slug: z.string() });

export const addressSchema = z.object({
  id: z.string(),
  province: provinceRefSchema,
  city: cityRefSchema,
  line: z.string(),
  postalCode: z.string(),
  plate: z.string().optional(),
  unit: z.string().optional(),
  receiverName: z.string(),
  receiverPhone: z.string(),
});
export type AddressDto = z.infer<typeof addressSchema>;

// A bounded, un-paginated list -- an address book is a small owned
// resource, same reasoning products.ts's getRelatedProducts uses to skip
// cursor pagination.
export const addressListResponseSchema = z.object({
  ok: z.literal(true),
  data: z.array(addressSchema),
});

export const addressResponseSchema = z.object({
  ok: z.literal(true),
  data: addressSchema,
});
