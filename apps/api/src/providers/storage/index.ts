import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "../../config/env.js";
import { LocalDiskStorageProvider } from "./LocalDiskStorageProvider.js";
import type { StorageProvider } from "./StorageProvider.js";

// apps/api/uploads — sibling of src/, not inside it, so it survives
// `tsc`'s dist/ output being wiped and rebuilt.
export const uploadsDir = path.join(
  fileURLToPath(new URL("../../../", import.meta.url)),
  "uploads",
);

function createStorageProvider(): StorageProvider {
  // STORAGE_DRIVER is a single-value enum today (only "local" exists) —
  // no switch needed yet. Gains a branch the day an S3-compatible driver
  // is actually built, mirroring providers/sms/index.ts.
  return new LocalDiskStorageProvider(uploadsDir, `${env.PUBLIC_URL}/uploads`);
}

export const storageProvider: StorageProvider = createStorageProvider();
export type {
  ImageFormat,
  ImageSize,
  StorageProvider,
  StoredImage,
  StoredImageVariant,
} from "./StorageProvider.js";
