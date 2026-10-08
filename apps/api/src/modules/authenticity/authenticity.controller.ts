import type { Request, Response } from "express";
import * as authenticityService from "./authenticity.service.js";

export async function verifyCodeHandler(req: Request, res: Response): Promise<void> {
  const result = await authenticityService.verifyCode(req.params.code as string);
  res.json({ ok: true, data: result });
}
