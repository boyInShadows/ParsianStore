import type { NextFunction, Request, Response } from "express";
import * as addressesService from "./addresses.service.js";
import type { AddressIdParam, AddressInput } from "./addresses.schema.js";

export async function listAddressesHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await addressesService.listAddresses(req.user!.sub);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

export async function createAddressHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = req.body as AddressInput;
    const data = await addressesService.createAddress(req.user!.sub, input);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

export async function updateAddressHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as unknown as AddressIdParam;
    const input = req.body as AddressInput;
    const data = await addressesService.updateAddress(req.user!.sub, id, input);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

export async function deleteAddressHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params as unknown as AddressIdParam;
    await addressesService.deleteAddress(req.user!.sub, id);
    res.json({ ok: true, data: { id } });
  } catch (err) {
    next(err);
  }
}
