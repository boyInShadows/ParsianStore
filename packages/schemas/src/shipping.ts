import { z } from "zod";

// §3.6's real 5 named courier methods -- a static const, not a Mongoose
// collection, mirroring catalogSystems.ts's own precedent (a fixed
// taxonomy shared by both apps, no admin CRUD consumer yet either).
// P6.S4: "حضوری" (in-person pickup) is intentionally NOT included --
// no real pickup location exists yet (an availability fact, not a
// business judgment call, same reasoning P4.S4's best-sellers section
// used for a similarly missing real signal). Add it for real once a
// real address exists to list.
export const SHIPPING_ZONES = ["tehran", "other"] as const;
export type ShippingZone = (typeof SHIPPING_ZONES)[number];

export interface ShippingMethodDef {
  code: string;
  name: { fa: string; en: string };
  zones: readonly ShippingZone[];
}

export const SHIPPING_METHODS = [
  {
    code: "post-pishtaz",
    name: { fa: "پست پیشتاز", en: "Post Pishtaz" },
    zones: ["tehran", "other"],
  },
  { code: "tipax", name: { fa: "تیپاکس", en: "Tipax" }, zones: ["tehran", "other"] },
  { code: "chapar", name: { fa: "چاپار", en: "Chapar" }, zones: ["tehran", "other"] },
  {
    code: "intracity",
    name: { fa: "پیک درون‌شهری", en: "Intra-city courier" },
    zones: ["tehran"],
  },
] as const satisfies readonly ShippingMethodDef[];

export type ShippingMethodCode = (typeof SHIPPING_METHODS)[number]["code"];

// Mirrors apps/api's POST /cart/estimate-shipping (P6.S4) -- same
// "apps/api has no Zod schema for its own responses" reasoning as every
// other module in this package.
export const shippingOptionSchema = z.object({
  methodCode: z.string(),
  name: z.object({ fa: z.string(), en: z.string() }),
  priceRial: z.number(),
});
export type ShippingOptionDto = z.infer<typeof shippingOptionSchema>;

export const estimateShippingResponseSchema = z.object({
  ok: z.literal(true),
  data: z.object({
    totalWeightGram: z.number(),
    options: z.array(shippingOptionSchema),
  }),
});
