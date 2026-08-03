import type { NextFunction, Request, Response } from "express";
import * as usersAdminService from "./users.admin.service.js";
import type {
  AdminCustomerListQuery,
  AdminUserIdParam,
  SetAccountTypeInput,
} from "./users.admin.schema.js";

export async function listAdminCustomersHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { phone, accountType, ...pagination } = req.validatedQuery as AdminCustomerListQuery;
    const { data, meta } = await usersAdminService.listAdminCustomers(pagination, {
      phone,
      accountType,
    });
    res.json({ ok: true, data, meta });
  } catch (err) {
    next(err);
  }
}

export async function getAdminCustomerHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as unknown as AdminUserIdParam;
    // P8.S7: the detail projection, not the raw user document -- the
    // screen needs resolved province/city names, garage vehicle names and
    // order stats, and shipping the whole document would leak fields
    // (wallet history, garage ids) the screen never renders.
    const data = await usersAdminService.getAdminCustomerDetail(id);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

export async function setAccountTypeHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as unknown as AdminUserIdParam;
    const data = await usersAdminService.setAccountType(id, req.body as SetAccountTypeInput);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}
