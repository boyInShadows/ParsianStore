import type { NextFunction, Request, Response } from "express";
import * as brandsAdminService from "./brands.admin.service.js";
import type {
  AdminBrandListQuery,
  CreateBrandInput,
  UpdateBrandInput,
} from "./brands.admin.schema.js";

export async function listAdminBrandsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { page, limit, sort, ...filters } = req.validatedQuery as AdminBrandListQuery;
    const { data, meta } = await brandsAdminService.listAdminBrands({ page, limit, sort }, filters);
    res.json({ ok: true, data, meta });
  } catch (err) {
    next(err);
  }
}

export async function getAdminBrandHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await brandsAdminService.getAdminBrandById(req.params.id as string);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

export async function createBrandHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await brandsAdminService.createBrand(req.body as CreateBrandInput);
    res.status(201).json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

export async function updateBrandHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await brandsAdminService.updateBrand(
      req.params.id as string,
      req.body as UpdateBrandInput,
    );
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

export async function deleteBrandHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await brandsAdminService.deleteBrand(req.params.id as string);
    res.json({ ok: true, data: null });
  } catch (err) {
    next(err);
  }
}

export async function restoreBrandHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await brandsAdminService.restoreBrand(req.params.id as string);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}
