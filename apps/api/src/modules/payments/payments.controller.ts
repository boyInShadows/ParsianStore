import type { NextFunction, Request, Response } from "express";
import * as paymentsService from "./payments.service.js";
import type { PaymentCallbackQuery } from "./payments.schema.js";

// No auth on this route (see payments.routes.ts) -- the caller is the
// payment gateway's own redirect, not a signed-in browser session. The
// Authority token itself is the real security boundary: it's only known
// to whoever initiated this specific payment and the gateway, matched
// against the exact Payment row it was issued for.
export async function paymentCallbackHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { orderId, Authority, Status } = req.validatedQuery as PaymentCallbackQuery;
    const data = await paymentsService.finalizePayment(orderId, Authority, Status);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}
