import type { NextFunction, Request, Response } from "express";
import * as brandsService from "./brands.service.js";
import type { CreateBrandInput, UpdateBrandInput } from "./brands.schema.js";
import type { PaginationQuery } from "../../utils/pagination.js";

export async function listBrandsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = req.validatedQuery as PaginationQuery;
    const { data, meta } = await brandsService.listBrands(query);
    res.json({ ok: true, data, meta });
  } catch (err) {
    next(err);
  }
}

export async function getBrandBySlugHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const brand = await brandsService.getBrandBySlug(req.params.slug as string);
    res.json({ ok: true, data: brand });
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
    const brand = await brandsService.createBrand(req.body as CreateBrandInput);
    res.status(201).json({ ok: true, data: brand });
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
    const brand = await brandsService.updateBrand(
      req.params.id as string,
      req.body as UpdateBrandInput,
    );
    res.json({ ok: true, data: brand });
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
    await brandsService.deleteBrand(req.params.id as string);
    res.json({ ok: true, data: null });
  } catch (err) {
    next(err);
  }
}
