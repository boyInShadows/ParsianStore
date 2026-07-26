import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { IMAGE_FORMATS, IMAGE_SIZES } from "./StorageProvider.js";
import { renderImageVariants } from "./imagePipeline.js";

async function sampleImageBuffer(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: { r: 100, g: 120, b: 200 } },
  })
    .png()
    .toBuffer();
}

describe("renderImageVariants", () => {
  it("renders every size in every format", async () => {
    const source = await sampleImageBuffer(2000, 1500);
    const variants = await renderImageVariants(source);

    expect(variants).toHaveLength(IMAGE_SIZES.length * IMAGE_FORMATS.length);
    for (const size of IMAGE_SIZES) {
      for (const format of IMAGE_FORMATS) {
        const variant = variants.find((v) => v.size === size && v.format === format);
        expect(variant).toBeDefined();
        expect(variant!.buffer.byteLength).toBeGreaterThan(0);
      }
    }
  });

  it("downscales a large source to each size's target width", async () => {
    const source = await sampleImageBuffer(2000, 1000);
    const variants = await renderImageVariants(source);

    const large = variants.find((v) => v.size === "large" && v.format === "webp")!;
    const meta = await sharp(large.buffer).metadata();
    expect(meta.width).toBe(1600);

    const thumb = variants.find((v) => v.size === "thumb" && v.format === "webp")!;
    const thumbMeta = await sharp(thumb.buffer).metadata();
    expect(thumbMeta.width).toBe(150);
  });

  it("never upscales a source smaller than a given size", async () => {
    const source = await sampleImageBuffer(100, 80);
    const variants = await renderImageVariants(source);

    const large = variants.find((v) => v.size === "large" && v.format === "avif")!;
    const meta = await sharp(large.buffer).metadata();
    expect(meta.width).toBe(100);
  });
});
