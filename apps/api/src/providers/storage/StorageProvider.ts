// §2.S8: every stored image is rendered into these 4 widths. Named by
// role (thumb/small/medium/large) rather than raw pixel counts so callers
// (PDP gallery, PLP card, admin grid, …) pick by intent, not by number.
export const IMAGE_SIZES = ["thumb", "small", "medium", "large"] as const;
export type ImageSize = (typeof IMAGE_SIZES)[number];

export const IMAGE_FORMATS = ["avif", "webp"] as const;
export type ImageFormat = (typeof IMAGE_FORMATS)[number];

export interface StoredImageVariant {
  size: ImageSize;
  format: ImageFormat;
  url: string;
}

export interface StoredImage {
  key: string;
  variants: StoredImageVariant[];
}

/** Swappable per §8's provider-interface rule — accessed only through this
 * interface, never a concrete implementation, everywhere else in the app. */
export interface StorageProvider {
  saveImage(buffer: Buffer): Promise<StoredImage>;
  deleteImage(key: string): Promise<void>;
}
