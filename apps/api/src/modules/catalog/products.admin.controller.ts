import type { NextFunction, Request, Response } from "express";
import * as productsAdminService from "./products.admin.service.js";
import { ApiError } from "../../utils/ApiError.js";
import { importProductsCsv } from "./products.import.service.js";
import type {
  AdminProductIdParam,
  AdminProductListQuery,
  CreateProductInput,
  UpdateProductInput,
  RemoveProductMediaInput,
} from "./products.admin.schema.js";

export async function importProductsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.is("text/csv")) throw new ApiError(415, "فایل CSV الزامی است");
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of req) {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array);
      size += buffer.length;
      if (size > 2 * 1024 * 1024) throw new ApiError(413, "حجم CSV بیشتر از ۲ مگابایت است");
      chunks.push(buffer);
    }
    const data = await importProductsCsv(
      Buffer.concat(chunks).toString("utf8"),
      req.query.commit === "true",
    );
    res.json({ ok: true, data });
  } catch (error) {
    next(error);
  }
}

export async function listAdminProductsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { status, q, ...pagination } = req.validatedQuery as AdminProductListQuery;
    const { data, meta } = await productsAdminService.listAdminProducts(pagination, { status, q });
    res.json({ ok: true, data, meta });
  } catch (err) {
    next(err);
  }
}

async function readImage(req: Request): Promise<Buffer> {
  if (!req.is(["image/jpeg", "image/png", "image/webp", "image/avif"]))
    throw new ApiError(415, "نوع فایل تصویر پشتیبانی نمی‌شود");
  const chunks: Buffer[] = [];
  let size = 0;
  const max = 8 * 1024 * 1024;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array);
    size += buffer.length;
    if (size > max) throw new ApiError(413, "حجم تصویر بیشتر از ۸ مگابایت است");
    chunks.push(buffer);
  }
  if (!size) throw new ApiError(400, "فایل تصویر ارسال نشده است");
  return Buffer.concat(chunks);
}
export async function addProductMediaHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await productsAdminService.addProductMedia(
      (req.params as unknown as AdminProductIdParam).id,
      await readImage(req),
    );
    res.status(201).json({ ok: true, data: { product: data.product, image: data.stored } });
  } catch (e) {
    next(e);
  }
}
export async function removeProductMediaHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await productsAdminService.removeProductMedia(
      (req.params as unknown as AdminProductIdParam).id,
      (req.body as RemoveProductMediaInput).url,
    );
    res.json({ ok: true, data: data });
  } catch (e) {
    next(e);
  }
}

export async function getAdminProductHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as unknown as AdminProductIdParam;
    const data = await productsAdminService.getAdminProductById(id);
    res.json({ ok: true, data: data });
  } catch (err) {
    next(err);
  }
}

export async function createProductHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await productsAdminService.createProduct(req.body as CreateProductInput);
    res.status(201).json({ ok: true, data: data });
  } catch (err) {
    next(err);
  }
}

export async function updateProductHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as unknown as AdminProductIdParam;
    const data = await productsAdminService.updateProduct(id, req.body as UpdateProductInput);
    res.json({ ok: true, data: data });
  } catch (err) {
    next(err);
  }
}

export async function archiveProductHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as unknown as AdminProductIdParam;
    const data = await productsAdminService.archiveProduct(id);
    res.json({ ok: true, data: data });
  } catch (err) {
    next(err);
  }
}
