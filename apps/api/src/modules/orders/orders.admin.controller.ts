import type { NextFunction, Request, Response } from "express";
import * as ordersAdminService from "./orders.admin.service.js";
import type {
  AdminOrderIdParam,
  AdminOrderListQuery,
  UpdateOrderStatusInput,
} from "./orders.admin.schema.js";

export async function listOrdersHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { status, ...pagination } = req.validatedQuery as AdminOrderListQuery;
    const { data, meta } = await ordersAdminService.listAllOrders(pagination, { status });
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
    const { id } = req.params as unknown as AdminOrderIdParam;
    const data = await ordersAdminService.getOrderById(id);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

export async function updateOrderStatusHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as unknown as AdminOrderIdParam;
    const input = req.body as UpdateOrderStatusInput;
    const data = await ordersAdminService.updateOrderStatus(id, input);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}
