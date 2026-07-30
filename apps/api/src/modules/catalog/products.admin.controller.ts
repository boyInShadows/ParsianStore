import type { NextFunction, Request, Response } from "express";
import * as productsAdminService from "./products.admin.service.js";
import type {
  AdminProductIdParam,
  AdminProductListQuery,
  CreateProductInput,
  UpdateProductInput,
} from "./products.admin.schema.js";

export async function listAdminProductsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { status, ...pagination } = req.validatedQuery as AdminProductListQuery;
    const { data, meta } = await productsAdminService.listAdminProducts(pagination, { status });
    res.json({ ok: true, data, meta });
  } catch (err) {
    next(err);
  }
}

export async function getAdminProductHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as unknown as AdminProductIdParam;
    const data = await productsAdminService.getAdminProductById(id);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

export async function createProductHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await productsAdminService.createProduct(req.body as CreateProductInput);
    res.status(201).json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

export async function updateProductHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as unknown as AdminProductIdParam;
    const data = await productsAdminService.updateProduct(id, req.body as UpdateProductInput);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

export async function archiveProductHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as unknown as AdminProductIdParam;
    const data = await productsAdminService.archiveProduct(id);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}
