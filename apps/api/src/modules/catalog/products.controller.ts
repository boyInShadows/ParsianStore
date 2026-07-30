import type { NextFunction, Request, Response } from "express";
import { toPublicProductJson } from "./pricing.js";
import * as productsService from "./products.service.js";
import type { ListProductsQuery, RelatedProductsQuery } from "./products.schema.js";

export async function listProductsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { sort, cursor, limit, ...filters } = req.validatedQuery as ListProductsQuery;
    const { data, meta } = await productsService.listProducts(filters, sort, cursor, limit);
    res.json({
      ok: true,
      data: data.map((product) => toPublicProductJson(product, req.user?.accountType)),
      meta,
    });
  } catch (err) {
    next(err);
  }
}

export async function getProductBySlugHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { product, brand, category, attributes } = await productsService.getProductDetailBySlug(
      req.params.slug as string,
    );
    res.json({
      ok: true,
      data: {
        ...toPublicProductJson(product, req.user?.accountType),
        attributes,
        brand: brand?.toJSON() ?? null,
        category: category?.toJSON() ?? null,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getRelatedProductsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { limit } = req.validatedQuery as RelatedProductsQuery;
    const { data, meta } = await productsService.getRelatedProducts(
      req.params.slug as string,
      limit,
    );
    res.json({
      ok: true,
      data: data.map((product) => toPublicProductJson(product, req.user?.accountType)),
      meta,
    });
  } catch (err) {
    next(err);
  }
}
