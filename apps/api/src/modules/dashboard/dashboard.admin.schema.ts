import { z } from "zod";
import { dashboardRangeSchema } from "schemas";

export const adminDashboardQuerySchema = z.object({
  // Not paginationQuerySchema: this endpoint returns one fixed-shape
  // summary object, never a list, so page/limit/sort would be meaningless
  // query params to accept and silently ignore.
  range: dashboardRangeSchema.optional().default("30d"),
});
export type AdminDashboardQuery = z.infer<typeof adminDashboardQuerySchema>;
