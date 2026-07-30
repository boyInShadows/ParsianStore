import type { NextFunction, Request, Response } from "express";
import * as checkoutService from "./checkout.service.js";
import type { InitiateCheckoutInput } from "./checkout.schema.js";

// requireAuth is applied in checkout.routes.ts, so req.user is always
// populated here -- checkout is auth-only per P6.S2's own decision.
export async function initiateCheckoutHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = req.body as InitiateCheckoutInput;
    const data = await checkoutService.initiateCheckout(
      req.user!.sub,
      req.user!.accountType,
      input,
    );
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}
