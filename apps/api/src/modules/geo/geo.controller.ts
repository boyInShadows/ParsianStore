import type { NextFunction, Request, Response } from "express";
import * as geoService from "./geo.service.js";
import type { ListCitiesQuery } from "./geo.schema.js";
import type { PaginationQuery } from "../../utils/pagination.js";

export async function listProvincesHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = req.validatedQuery as PaginationQuery;
    const { data, meta } = await geoService.listProvinces(query);
    res.json({ ok: true, data, meta });
  } catch (err) {
    next(err);
  }
}

export async function listCitiesHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { provinceId, ...pagination } = req.validatedQuery as ListCitiesQuery;
    const { data, meta } = await geoService.listCities(provinceId, pagination);
    res.json({ ok: true, data, meta });
  } catch (err) {
    next(err);
  }
}
