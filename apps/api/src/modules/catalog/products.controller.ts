import type { Request, Response } from "express";
import * as productsService from "./products.service.js";
import type { ListProductsQuery, RelatedProductsQuery } from "./products.schema.js";

export async function listProductsHandler(req: Request, res: Response): Promise<void> {
  const { sort, cursor, limit, ...filters } = req.validatedQuery as ListProductsQuery;
  // The service returns finished DTOs now. Shaping used to happen here,
  // which meant the viewer-specific price rules lived one layer above the
  // module that owns them; §8 wants that decision inside the service.
  const { data, meta } = await productsService.listProducts(
    filters,
    sort,
    cursor,
    limit,
    req.user?.accountType,
  );
  res.json({ ok: true, data, meta });
}

export async function getProductBySlugHandler(req: Request, res: Response): Promise<void> {
  const data = await productsService.getProductDetailBySlug(
    req.params.slug as string,
    req.user?.accountType,
  );
  res.json({ ok: true, data });
}

export async function getRelatedProductsHandler(req: Request, res: Response): Promise<void> {
  const { limit } = req.validatedQuery as RelatedProductsQuery;
  const { data, meta } = await productsService.getRelatedProducts(
    req.params.slug as string,
    limit,
    req.user?.accountType,
  );
  res.json({
    ok: true,
    data,
    meta,
  });
}
