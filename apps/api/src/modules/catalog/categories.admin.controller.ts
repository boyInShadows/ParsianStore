import type { Request, Response } from "express";
import * as categoriesAdminService from "./categories.admin.service.js";
import type {
  AdminCategoryListQuery,
  CreateCategoryInput,
  UpdateCategoryInput,
} from "./categories.admin.schema.js";

export async function listAdminCategoriesHandler(req: Request, res: Response): Promise<void> {
  const { page, limit, sort, ...filters } = req.validatedQuery as AdminCategoryListQuery;
  const { data, meta } = await categoriesAdminService.listAdminCategories(
    { page, limit, sort },
    filters,
  );
  res.json({ ok: true, data, meta });
}

export async function getAdminCategoryHandler(req: Request, res: Response): Promise<void> {
  const data = await categoriesAdminService.getAdminCategoryById(req.params.id as string);
  res.json({ ok: true, data });
}

export async function createCategoryHandler(req: Request, res: Response): Promise<void> {
  const data = await categoriesAdminService.createCategory(req.body as CreateCategoryInput);
  res.status(201).json({ ok: true, data });
}

export async function updateCategoryHandler(req: Request, res: Response): Promise<void> {
  const data = await categoriesAdminService.updateCategory(
    req.params.id as string,
    req.body as UpdateCategoryInput,
  );
  res.json({ ok: true, data });
}

export async function deleteCategoryHandler(req: Request, res: Response): Promise<void> {
  await categoriesAdminService.deleteCategory(req.params.id as string);
  res.json({ ok: true, data: null });
}

export async function restoreCategoryHandler(req: Request, res: Response): Promise<void> {
  const data = await categoriesAdminService.restoreCategory(req.params.id as string);
  res.json({ ok: true, data });
}
