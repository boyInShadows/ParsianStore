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
    const data = await usersAdminService.getAdminCustomerById(id);
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
