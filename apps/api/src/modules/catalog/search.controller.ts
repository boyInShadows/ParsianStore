import type { Request, Response } from "express";
import * as searchService from "./search.service.js";
import type { FacetsQuery, SearchProductsQuery } from "./search.schema.js";

export async function searchProductsHandler(req: Request, res: Response): Promise<void> {
  const { q, vehicle, ...pagination } = req.validatedQuery as SearchProductsQuery;
  const { data, meta } = await searchService.searchProducts(
    q,
    vehicle,
    pagination,
    req.user?.accountType,
  );
  res.json({ ok: true, data, meta });
}

export async function getFacetsHandler(req: Request, res: Response): Promise<void> {
  const filters = req.validatedQuery as FacetsQuery;
  const facets = await searchService.getFacets(filters);
  res.json({ ok: true, data: facets });
}
