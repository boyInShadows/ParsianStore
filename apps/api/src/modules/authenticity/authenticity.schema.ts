import { z } from "zod";

export const verifyCodeParamSchema = z.object({
  code: z.string().min(1, "کد اصالت الزامی است"),
});
