import sharp from "sharp";
import { IMAGE_FORMATS, IMAGE_SIZES, type ImageFormat, type ImageSize } from "./StorageProvider.js";

const SIZE_WIDTHS: Record<ImageSize, number> = {
  thumb: 150,
  small: 400,
  medium: 800,
  large: 1600,
};

export interface RenderedImageVariant {
  size: ImageSize;
  format: ImageFormat;
  buffer: Buffer;
}

/**
 * P2.S8: every uploaded product image becomes 4 sizes x {avif, webp} = 8
 * files (§10 non-functional: "file uploads ... re-encoded through sharp").
 * Pure transform, no filesystem/network I/O, so any StorageProvider driver
 * (local disk now, an S3-compatible one later) reuses it unchanged.
 * `withoutEnlargement` means a source image smaller than a given width is
 * kept at its original size rather than upscaled and blurred.
 */
export async function renderImageVariants(buffer: Buffer): Promise<RenderedImageVariant[]> {
  const source = sharp(buffer).rotate();

  const variants = await Promise.all(
    IMAGE_SIZES.flatMap((size) => {
      const resized = source.clone().resize({ width: SIZE_WIDTHS[size], withoutEnlargement: true });
      return IMAGE_FORMATS.map(async (format): Promise<RenderedImageVariant> => {
        const rendered =
          format === "avif"
            ? await resized.clone().avif({ quality: 60 }).toBuffer()
            : await resized.clone().webp({ quality: 75 }).toBuffer();
        return { size, format, buffer: rendered };
      });
    }),
  );

  return variants;
}
