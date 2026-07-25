import { app } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { connectDB, disconnectDB } from "./config/db.js";
import type { Server } from "node:http";

let server: Server;

async function start(): Promise<void> {
  await connectDB();
  server = app.listen(env.PORT, () => {
    logger.info(`api listening on http://localhost:${env.PORT}`);
  });
}

function shutdown(signal: string): void {
  logger.info(`${signal} received, shutting down gracefully`);
  server.close(async (err) => {
    if (err) {
      logger.error({ err }, "Error during shutdown");
      process.exit(1);
    }
    await disconnectDB();
    process.exit(0);
  });

  // If connections don't drain in time, force-exit rather than hang forever.
  setTimeout(() => {
    logger.error("Graceful shutdown timed out, forcing exit");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

start().catch((err: unknown) => {
  logger.error({ err }, "Failed to start server");
  process.exit(1);
});
