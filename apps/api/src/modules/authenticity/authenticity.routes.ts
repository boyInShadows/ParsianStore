import { Router } from "express";
import { validateParams } from "../../middleware/validate.js";
import * as authenticityController from "./authenticity.controller.js";
import { verifyCodeParamSchema } from "./authenticity.schema.js";

export const authenticityRouter = Router();

authenticityRouter.get(
  "/verify/:code",
  validateParams(verifyCodeParamSchema),
  authenticityController.verifyCodeHandler,
);
