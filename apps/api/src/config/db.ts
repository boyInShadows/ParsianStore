import mongoose from "mongoose";
import { env } from "./env.js";
import { logger } from "./logger.js";

let listenersAttached = false;

function attachConnectionLogging(): void {
  if (listenersAttached) return;
  listenersAttached = true;
  mongoose.connection.on("error", (err: unknown) =>
    logger.error({ err }, "MongoDB connection error"),
  );
  mongoose.connection.on("disconnected", () => logger.warn("MongoDB disconnected"));
}

export async function connectDB(uri: string = env.MONGODB_URI): Promise<typeof mongoose> {
  attachConnectionLogging();
  await mongoose.connect(uri);
  logger.info({ db: mongoose.connection.name }, "MongoDB connected");
  return mongoose;
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
}
