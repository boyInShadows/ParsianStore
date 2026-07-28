import { z } from "zod";

// Mirrors apps/api/src/modules/fitment/fitment.service.ts's FitmentVerdict.
// `confidence: null` (no Fitment record at all) is kept distinct from the
// explicit "check" advisory -- see that file's own doc comment -- even
// though the PDP's fitment banner (P5.S2) renders both the same neutral
// way today.
export const FITMENT_CONFIDENCES = ["exact", "likely", "check"] as const;

export const fitmentVerdictSchema = z.object({
  confidence: z.enum(FITMENT_CONFIDENCES).nullable(),
  note: z.string().optional(),
});
export type FitmentVerdictDto = z.infer<typeof fitmentVerdictSchema>;

export const fitmentCheckResponseSchema = z.object({
  ok: z.literal(true),
  data: fitmentVerdictSchema,
});
