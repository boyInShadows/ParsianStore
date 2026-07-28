import type { NextFunction, Request, Response } from "express";
import * as attributesService from "./attributes.service.js";
import type { CreateAttributeInput, UpdateAttributeInput } from "./attributes.schema.js";
import type { PaginationQuery } from "../../utils/pagination.js";

export async function listAttributesHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = req.validatedQuery as PaginationQuery;
    const { data, meta } = await attributesService.listAttributes(query);
    res.json({ ok: true, data, meta });
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
    const attribute = await attributesService.createAttribute(req.body as CreateAttributeInput);
    res.status(201).json({ ok: true, data: attribute });
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
    const attribute = await attributesService.updateAttribute(
      req.params.id as string,
      req.body as UpdateAttributeInput,
    );
    res.json({ ok: true, data: attribute });
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
