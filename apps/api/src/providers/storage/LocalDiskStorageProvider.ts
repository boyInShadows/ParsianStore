import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { nanoid } from "nanoid";
import { renderImageVariants } from "./imagePipeline.js";
import type { StorageProvider, StoredImage } from "./StorageProvider.js";

/** Default driver for Phases 2-8 (§4 manifest note, mirrors MockSmsProvider) —
 * writes rendered variants under `uploadsDir`, served back out at
 * `publicBaseUrl` (wired to `express.static` in app.ts). */
export class LocalDiskStorageProvider implements StorageProvider {
  constructor(
    private readonly uploadsDir: string,
    private readonly publicBaseUrl: string,
  ) {}

  async saveImage(buffer: Buffer): Promise<StoredImage> {
    const key = nanoid();
    const dir = path.join(this.uploadsDir, key);
    await mkdir(dir, { recursive: true });

    const variants = await renderImageVariants(buffer);
    await Promise.all(
      variants.map((variant) =>
        writeFile(path.join(dir, `${variant.size}.${variant.format}`), variant.buffer),
      ),
    );

    return {
      key,
      variants: variants.map((variant) => ({
        size: variant.size,
        format: variant.format,
        url: `${this.publicBaseUrl}/${key}/${variant.size}.${variant.format}`,
      })),
    };
  }

  async deleteImage(key: string): Promise<void> {
    await rm(path.join(this.uploadsDir, key), { recursive: true, force: true });
  }
}
