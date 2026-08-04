import type { NextFunction, Request, Response } from "express";
import * as attributesService from "./attributes.service.js";
import type {
  CreateAttributeInput,
  ListAttributesQuery,
  UpdateAttributeInput,
} from "./attributes.schema.js";

export async function listAttributesHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { page, limit, sort, ...filters } = req.validatedQuery as ListAttributesQuery;
    const { data, meta } = await attributesService.listAttributes({ page, limit, sort }, filters);
    res.json({ ok: true, data, meta });
  } catch (err) {
    next(err);
  }
}

export async function getAttributeHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await attributesService.getAttributeById(req.params.id as string);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

export async function createAttributeHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await attributesService.createAttribute(req.body as CreateAttributeInput);
    res.status(201).json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

export async function updateAttributeHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await attributesService.updateAttribute(
      req.params.id as string,
      req.body as UpdateAttributeInput,
    );
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

export async function deleteAttributeHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await attributesService.deleteAttribute(req.params.id as string);
    res.json({ ok: true, data: null });
  } catch (err) {
    next(err);
  }
}

export async function restoreAttributeHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await attributesService.restoreAttribute(req.params.id as string);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}
