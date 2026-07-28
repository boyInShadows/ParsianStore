import type { NextFunction, Request, Response } from "express";
import * as vehiclesService from "./vehicles.service.js";
import type { ListEnginesQuery, ListGenerationsQuery, ListModelsQuery } from "./vehicles.schema.js";
import type { PaginationQuery } from "../../utils/pagination.js";

export async function listMakesHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = req.validatedQuery as PaginationQuery;
    const { data, meta } = await vehiclesService.listMakes(query);
    res.json({ ok: true, data, meta });
  } catch (err) {
    next(err);
  }
}

export async function listModelsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { makeId, ...pagination } = req.validatedQuery as ListModelsQuery;
    const { data, meta } = await vehiclesService.listModels(makeId, pagination);
    res.json({ ok: true, data, meta });
  } catch (err) {
    next(err);
  }
}

export async function listGenerationsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { modelId, ...pagination } = req.validatedQuery as ListGenerationsQuery;
    const { data, meta } = await vehiclesService.listGenerations(modelId, pagination);
    res.json({ ok: true, data, meta });
  } catch (err) {
    next(err);
  }
}

export async function listEnginesHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { genId, ...pagination } = req.validatedQuery as ListEnginesQuery;
    const { data, meta } = await vehiclesService.listEngines(genId, pagination);
    res.json({ ok: true, data, meta });
  } catch (err) {
    next(err);
  }
}
