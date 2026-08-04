import type { NextFunction, Request, Response } from "express";
import * as fitmentAdminService from "./fitment.admin.service.js";
import type {
  AdminFitmentListQuery,
  CreateFitmentInput,
  UpdateFitmentInput,
} from "./fitment.admin.schema.js";

export async function listAdminFitmentsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { page, limit, sort, ...filters } = req.validatedQuery as AdminFitmentListQuery;
    const { data, meta } = await fitmentAdminService.listAdminFitments(
      { page, limit, sort },
      filters,
    );
    res.json({ ok: true, data, meta });
  } catch (err) {
    next(err);
  }
}

export async function getAdminFitmentHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await fitmentAdminService.getAdminFitmentById(req.params.id as string);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

export async function createFitmentHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await fitmentAdminService.createFitment(req.body as CreateFitmentInput);
    res.status(201).json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

export async function updateFitmentHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await fitmentAdminService.updateFitment(
      req.params.id as string,
      req.body as UpdateFitmentInput,
    );
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

export async function deleteFitmentHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await fitmentAdminService.deleteFitment(req.params.id as string);
    res.json({ ok: true, data: null });
  } catch (err) {
    next(err);
  }
}

export async function restoreFitmentHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await fitmentAdminService.restoreFitment(req.params.id as string);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}
