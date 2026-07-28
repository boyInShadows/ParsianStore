import type { NextFunction, Request, Response } from "express";
import * as categoriesService from "./categories.service.js";
import type {
  CreateCategoryInput,
  ListCategoriesQuery,
  UpdateCategoryInput,
} from "./categories.schema.js";

export async function listCategoriesHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { parentId, ...pagination } = req.validatedQuery as ListCategoriesQuery;
    const { data, meta } = await categoriesService.listCategories(parentId, pagination);
    res.json({ ok: true, data, meta });
  } catch (err) {
    next(err);
  }
}

export async function getCategoryBySlugHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const category = await categoriesService.getCategoryBySlug(req.params.slug as string);
    res.json({ ok: true, data: category });
  } catch (err) {
    next(err);
  }
}

export async function createCategoryHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const category = await categoriesService.createCategory(req.body as CreateCategoryInput);
    res.status(201).json({ ok: true, data: category });
  } catch (err) {
    next(err);
  }
}

export async function updateCategoryHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const category = await categoriesService.updateCategory(
      req.params.id as string,
      req.body as UpdateCategoryInput,
    );
    res.json({ ok: true, data: category });
  } catch (err) {
    next(err);
  }
}

export async function deleteCategoryHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await categoriesService.deleteCategory(req.params.id as string);
    res.json({ ok: true, data: null });
  } catch (err) {
    next(err);
  }
}
