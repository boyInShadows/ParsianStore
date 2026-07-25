import express, { type Request, type Response } from "express";
import { healthResponseSchema } from "schemas";

export function healthHandler(_req: Request, res: Response): void {
  const payload = healthResponseSchema.parse({
    ok: true,
    data: { status: "up" },
  });
  res.json(payload);
}

export const app = express();

app.get("/api/v1/health", healthHandler);
