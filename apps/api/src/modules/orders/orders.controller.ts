import type { NextFunction, Request, Response } from "express";
import * as ordersService from "./orders.service.js";
import type { OrderCodeParam } from "./orders.schema.js";
import type { PaginationQuery } from "../../utils/pagination.js";

export async function listOrdersHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const pagination = req.validatedQuery as PaginationQuery;
    const { data, meta } = await ordersService.listOrders(req.user!.sub, pagination);
    res.json({ ok: true, data, meta });
  } catch (err) {
    next(err);
  }
}

export async function getOrderHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { code } = req.params as unknown as OrderCodeParam;
    const data = await ordersService.getOrderByCode(req.user!.sub, code);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}
