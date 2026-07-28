import type { NextFunction, Request, Response } from "express";
import * as authenticityService from "./authenticity.service.js";

export async function verifyCodeHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await authenticityService.verifyCode(req.params.code as string);
    res.json({ ok: true, data: result });
  } catch (err) {
    next(err);
  }
}
