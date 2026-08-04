import type { NextFunction, Request, Response } from "express";
import * as service from "./vehicles.admin.service.js";
import type { PaginationQuery } from "../../utils/pagination.js";

/**
 * P8.S6. Four entities with identical controller shapes -- written once
 * as a factory rather than four times by hand. Each entity supplies only
 * what actually differs: which service functions to call.
 */
interface EntityHandlers<TList, TCreate, TUpdate> {
  list: (pagination: PaginationQuery, filters: TList) => Promise<service.Listed<unknown>>;
  create: (input: TCreate) => Promise<unknown>;
  update: (id: string, input: TUpdate) => Promise<unknown>;
  remove: (id: string) => Promise<void>;
  restore: (id: string) => Promise<unknown>;
}

function makeHandlers<TList, TCreate, TUpdate>(entity: EntityHandlers<TList, TCreate, TUpdate>) {
  return {
    async list(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const { page, limit, sort, ...filters } = req.validatedQuery as PaginationQuery &
          Record<string, unknown>;
        const { data, meta } = await entity.list({ page, limit, sort }, filters as TList);
        res.json({ ok: true, data, meta });
      } catch (err) {
        next(err);
      }
    },
    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const data = await entity.create(req.body as TCreate);
        res.status(201).json({ ok: true, data });
      } catch (err) {
        next(err);
      }
    },
    async update(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const data = await entity.update(req.params.id as string, req.body as TUpdate);
        res.json({ ok: true, data });
      } catch (err) {
        next(err);
      }
    },
    async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        await entity.remove(req.params.id as string);
        res.json({ ok: true, data: null });
      } catch (err) {
        next(err);
      }
    },
    async restore(req: Request, res: Response, next: NextFunction): Promise<void> {
      try {
        const data = await entity.restore(req.params.id as string);
        res.json({ ok: true, data });
      } catch (err) {
        next(err);
      }
    },
  };
}

export const makes = makeHandlers({
  list: service.listAdminMakes,
  create: service.createMake,
  update: service.updateMake,
  remove: service.deleteMake,
  restore: service.restoreMake,
});

export const models = makeHandlers({
  list: service.listAdminModels,
  create: service.createModel,
  update: service.updateModel,
  remove: service.deleteModel,
  restore: service.restoreModel,
});

export const generations = makeHandlers({
  list: service.listAdminGenerations,
  create: service.createGeneration,
  update: service.updateGeneration,
  remove: service.deleteGeneration,
  restore: service.restoreGeneration,
});

export const engines = makeHandlers({
  list: service.listAdminEngines,
  create: service.createEngine,
  update: service.updateEngine,
  remove: service.deleteEngine,
  restore: service.restoreEngine,
});
