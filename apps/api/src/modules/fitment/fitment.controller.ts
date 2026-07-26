import type { NextFunction, Request, Response } from "express";
import * as fitmentService from "./fitment.service.js";
import type { FitmentCheckQuery, FitmentProductsQuery } from "./fitment.schema.js";

export async function checkFitmentHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { productId, vehicleKey } = req.validatedQuery as FitmentCheckQuery;
    const verdict = await fitmentService.checkFitment(productId, vehicleKey);
    res.json({ ok: true, data: verdict });
  } catch (err) {
    next(err);
  }
}

export async function listFittingProductsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { vehicleKey, category, ...pagination } = req.validatedQuery as FitmentProductsQuery;
    const { data, meta } = await fitmentService.listFittingProducts(
      vehicleKey,
      category,
      pagination,
    );
    res.json({ ok: true, data, meta });
  } catch (err) {
    next(err);
  }
}
