import type { NextFunction, Request, Response } from "express";
import { toPublicProductJson } from "./pricing.js";
import * as searchService from "./search.service.js";
import type { FacetsQuery, SearchProductsQuery } from "./search.schema.js";

export async function searchProductsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { q, vehicle, ...pagination } = req.validatedQuery as SearchProductsQuery;
    const { data, meta } = await searchService.searchProducts(q, vehicle, pagination);
    res.json({
      ok: true,
      data: data.map((product) => toPublicProductJson(product, req.user?.accountType)),
      meta,
    });
  } catch (err) {
    next(err);
  }
}

export async function getFacetsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const filters = req.validatedQuery as FacetsQuery;
    const facets = await searchService.getFacets(filters);
    res.json({ ok: true, data: facets });
  } catch (err) {
    next(err);
  }
}
