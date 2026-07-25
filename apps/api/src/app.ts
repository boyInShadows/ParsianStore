import express, { type Request, type Response } from "express";
import { healthResponseSchema } from "schemas";

export const app = express();

app.get("/api/v1/health", (_req: Request, res: Response) => {
  const payload = healthResponseSchema.parse({
    ok: true,
    data: { status: "up" },
  });
  res.json(payload);
});
