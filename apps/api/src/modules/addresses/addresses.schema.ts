import { z } from "zod";
import { normalizePhone, normalizePostalCode } from "schemas";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "شناسه معتبر نیست");

// postalCode/receiverPhone both normalize through the same §7.5 helpers
// the rest of this codebase already uses -- a Persian-keyboard digit
// never reaches the stored value.
export const addressInputSchema = z.object({
  provinceId: objectId,
  cityId: objectId,
  line: z.string().min(1, "آدرس را وارد کنید"),
  postalCode: z
    .string()
    .transform(normalizePostalCode)
    .pipe(z.string().regex(/^\d{10}$/, "کد پستی باید ۱۰ رقم باشد")),
  plate: z.string().optional(),
  unit: z.string().optional(),
  receiverName: z.string().min(1, "نام گیرنده را وارد کنید"),
  receiverPhone: z.string().transform(normalizePhone),
});
export type AddressInput = z.infer<typeof addressInputSchema>;

export const addressIdParamSchema = z.object({
  id: objectId,
});
export type AddressIdParam = z.infer<typeof addressIdParamSchema>;
