import { z } from "zod";

// Mirrors the subset of apps/api's User (models/User.ts) the web client
// actually needs to render (header signed-in state, the login flow) --
// same reasoning as products.ts/facets.ts: apps/api has no Zod schema for
// its own responses, but the web client needs to validate an external
// fetch at runtime. Other real User fields (addresses, garage,
// walletBalanceRial, ...) aren't needed by this step and are simply
// stripped by the schema, not rejected.
export const meSchema = z.object({
  id: z.string(),
  phone: z.string(),
  name: z.string(),
  email: z.string().email().optional(),
  role: z.enum(["customer", "support", "operator", "admin", "superadmin"]),
  accountType: z.enum(["retail", "wholesale"]),
});
export type MeDto = z.infer<typeof meSchema>;

export const meResponseSchema = z.object({
  ok: z.literal(true),
  data: meSchema,
});

export const otpRequestResponseSchema = z.object({
  ok: z.literal(true),
  data: z.object({ message: z.string() }),
});

// POST /auth/otp/verify (and POST /auth/refresh) both return
// `{ ok: true, data: session.user }` (auth.controller.ts) -- same shape
// as GET /auth/me.
export const otpVerifyResponseSchema = meResponseSchema;

export const updateProfileInputSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.union([z.string().trim().email(), z.literal("")]).optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileInputSchema>;

export const updateProfileResponseSchema = meResponseSchema;
