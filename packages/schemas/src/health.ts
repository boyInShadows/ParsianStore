import { z } from "zod";

export const healthResponseSchema = z.object({
  ok: z.literal(true),
  data: z.object({
    status: z.literal("up"),
  }),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
