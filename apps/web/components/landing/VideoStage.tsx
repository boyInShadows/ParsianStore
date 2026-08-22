"use client"; // needs the viewport + reduced-motion state to decide whether to fetch video at all

import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";
import { LandingImage } from "./LandingImage";

/** The width below which no video bytes are fetched at all (fableTasks D3). */
const DESKTOP_QUERY = "(min-width: 1024px)";

type Props = {
  /** Clip base name under `/landing/video/`, e.g. `chapter-2`. */
  clip: string;
  /** Describes the footage. It is atmosphere, so say so -- never evidence. */
  alt: string;
  className?: string;
  children?: React.ReactNode;
};

/**
 * An atmosphere clip used as a stage, with its poster as the real content.
 *
 * The poster always renders. The `<video>` mounts only on a wide viewport with
 * motion allowed, which is what makes "mobile fetches zero video bytes" true
 * rather than aspirational -- `preload="none"` alone would not survive an
 * `autoplay` attribute, and a CSS-hidden video is still a video the browser may
 * decide to fetch. Not rendering the element is the only honest version.
 *
 * The clips are already mirrored and audio-free (P9.S3), so there is no `muted`
 * story to get wrong: the file has no audio track at all. `muted` stays on
 * anyway, because autoplay policies key off the attribute, not the track.
 *
 * design-quality.md's imagery law governs what may go here: this is generated
 * artwork, so it stages a beat. It never stands in for a product photo and
 * never poses as inspection evidence -- hence `alt` describing it as
 * illustration, and real catalog data living in the markup on top of it.
 */
export function VideoStage({ clip, alt, className = "", children }: Props) {
  const reduceMotion = useReducedMotion();
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(DESKTOP_QUERY);
    const sync = () => setIsDesktop(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  const showVideo = isDesktop && !reduceMotion;

  return (
    <div className={`relative overflow-hidden bg-graphite-950 ${className}`}>
      <LandingImage
        src={`/landing/video/${clip}-poster`}
        alt={alt}
        sizes="100vw"
        className="absolute inset-0 h-full w-full object-cover"
      />
      {showVideo ? (
        <video
          // React sets `muted` as a DOM property and never emits the HTML
          // attribute, which is a real autoplay footgun: Safari and Chrome
          // decide whether to allow autoplay from the element's state at load
          // time, and a race there is invisible until a video silently refuses
          // to start. Setting it on the node as well removes the race. The
          // files carry no audio track at all (P9.S3 strips it), so this is
          // belt and braces, not the only thing keeping the page quiet.
          ref={(node) => {
            if (node) node.muted = true;
          }}
          src={`/landing/video/${clip}.mp4`}
          poster={`/landing/video/${clip}-poster-1440.avif`}
          autoPlay
          muted
          loop
          playsInline
          preload="none"
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}
      {children}
    </div>
  );
}
