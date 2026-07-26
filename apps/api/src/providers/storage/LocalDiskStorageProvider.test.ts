import { afterAll, describe, expect, it } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { IMAGE_FORMATS, IMAGE_SIZES } from "./StorageProvider.js";
import { LocalDiskStorageProvider } from "./LocalDiskStorageProvider.js";

async function sampleImageBuffer(): Promise<Buffer> {
  return sharp({
    create: { width: 500, height: 500, channels: 3, background: { r: 200, g: 40, b: 30 } },
  })
    .png()
    .toBuffer();
}

const tempDirs: string[] = [];

afterAll(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("LocalDiskStorageProvider", () => {
  it("saves every size/format variant to disk and returns matching URLs", async () => {
    const uploadsDir = await mkdtemp(path.join(tmpdir(), "parsian-store-uploads-"));
    tempDirs.push(uploadsDir);
    const provider = new LocalDiskStorageProvider(uploadsDir, "http://localhost:4000/uploads");

    const stored = await provider.saveImage(await sampleImageBuffer());

    expect(stored.variants).toHaveLength(IMAGE_SIZES.length * IMAGE_FORMATS.length);
    for (const variant of stored.variants) {
      expect(variant.url).toBe(
        `http://localhost:4000/uploads/${stored.key}/${variant.size}.${variant.format}`,
      );
      const file = await readFile(
        path.join(uploadsDir, stored.key, `${variant.size}.${variant.format}`),
      );
      expect(file.byteLength).toBeGreaterThan(0);
    }
  });

  it("removes every variant for a key on delete", async () => {
    const uploadsDir = await mkdtemp(path.join(tmpdir(), "parsian-store-uploads-"));
    tempDirs.push(uploadsDir);
    const provider = new LocalDiskStorageProvider(uploadsDir, "http://localhost:4000/uploads");

    const stored = await provider.saveImage(await sampleImageBuffer());
    await provider.deleteImage(stored.key);

    await expect(readFile(path.join(uploadsDir, stored.key, "thumb.webp"))).rejects.toThrow();
  });

  it("deleting an unknown key is a no-op, not an error", async () => {
    const uploadsDir = await mkdtemp(path.join(tmpdir(), "parsian-store-uploads-"));
    tempDirs.push(uploadsDir);
    const provider = new LocalDiskStorageProvider(uploadsDir, "http://localhost:4000/uploads");

    await expect(provider.deleteImage("does-not-exist")).resolves.toBeUndefined();
  });
});
