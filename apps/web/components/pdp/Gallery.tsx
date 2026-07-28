type Props = {
  media: string[];
  noPhotoLabel: string;
};

// No product photography exists in the seed data yet (media is always []
// -- same honesty pattern as components/plp/ProductCard.tsx). Written to
// also handle a populated `media` array generically for when Phase 3's
// StorageProvider actually has images to serve, but real `next/image` +
// `next.config.js` remotePatterns wiring for the API's /uploads origin is
// deliberately deferred until there's a real image to test against --
// YAGNI on config nothing exercises yet, not an oversight.
export function Gallery({ media, noPhotoLabel }: Props) {
  if (media.length === 0) {
    return (
      <div
        role="img"
        aria-label={noPhotoLabel}
        className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-border bg-surface-raised text-body text-text-muted"
      >
        {noPhotoLabel}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-2">
      {media.map((url) => (
        // Plain <img>, not next/image: remotePatterns for the API's
        // /uploads origin isn't configured yet (no real product has media
        // today, so nothing exercises this path) -- swap in next/image
        // (masterPlan §10) once there's a real image to wire it against.
        <img
          key={url}
          src={url}
          alt=""
          className="col-span-4 aspect-square rounded-lg border border-border object-cover first:col-span-4"
        />
      ))}
    </div>
  );
}
