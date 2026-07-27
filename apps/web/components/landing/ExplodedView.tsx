"use client"; // motion (load choreography) + hover/focus interaction state

import { motion, useReducedMotion } from "motion/react";
import type { CatalogSystemCode } from "schemas";
import { DURATION, EASE_OUT } from "@/lib/motion-tokens";
import { EXPLODED_NODES, EXPLODED_VIEWBOX, type ExplodedNode } from "./explodedViewLayout";

export type NodeLabels = Record<
  CatalogSystemCode,
  { partsCountLabel: string | null; linkLabel: string }
>;

type Props = {
  svgLabel: string;
  nodeLabels: NodeLabels;
};

// Car-body centroid -- masterPlan.md §1.3: components animate outward from
// roughly "inside" the assembled car to their labeled, spread-out position.
const CAR_CENTER_X = 520;
const CAR_CENTER_Y = 240;

const STAGGER_STEP = 0.05;

const parentVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: STAGGER_STEP, delayChildren: DURATION.slow } },
};

function nodeVariants(node: ExplodedNode) {
  return {
    hidden: { opacity: 0, x2: CAR_CENTER_X, y2: CAR_CENTER_Y, cx: CAR_CENTER_X, cy: CAR_CENTER_Y },
    visible: {
      opacity: 1,
      x2: node.x,
      y2: node.y,
      cx: node.x,
      cy: node.y,
      transition: { duration: DURATION.slow, ease: EASE_OUT },
    },
  };
}

// masterPlan.md P4.S6: "cut anything that doesn't serve the page. Remove
// one accessory." The four filled "wheel" rects this originally had
// (P4.S2) were the only solid-fill shapes in an otherwise all-hairline
// composition -- decorative clutter that didn't make the silhouette read
// any more clearly as a car, and broke the "hairline rules" vernacular
// (§6.1) the rest of the Exploded View already holds to. Removed; the
// body outline + windshield rect alone already read as a car from
// directly above.
function CarSilhouette({ playIntro }: { playIntro: boolean }) {
  return (
    <motion.g
      initial={playIntro ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      transition={{ duration: DURATION.base }}
      className="text-border"
    >
      <path
        d="M 400 200 Q 520 182 640 200 Q 680 206 680 240 Q 680 274 640 280 Q 520 298 400 280 Q 360 274 360 240 Q 360 206 400 200 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <rect
        x="460"
        y="208"
        width="120"
        height="30"
        rx="6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </motion.g>
  );
}

// Hover/focus reveal (name + count) and highlight (brand color) are plain
// CSS group-hover/group-focus-visible -- no JS state needed, and they work
// identically whether or not the load-choreography motion is reduced.
// `motion-reduce:transition-none` still guards even these small
// transitions per masterPlan.md §5's "reduced motion = instant final
// state, never 'a bit less motion'". `initial`/`animate` are intentionally
// NOT set here -- they're inherited from ExplodedView's orchestrating
// motion.g (variant label + `initial={false}` both propagate through the
// intervening plain <a>), which is what keeps every node in sync with the
// parent's stagger instead of each one racing its own animation.
function Node({
  node,
  partsCountLabel,
  linkLabel,
}: {
  node: ExplodedNode;
  partsCountLabel: string | null;
  linkLabel: string;
}) {
  const labelDy = node.row === "top" ? -14 : 22;
  const nameDy = node.row === "top" ? -28 : 36;

  return (
    <a
      href={`/c/${node.slug}`}
      aria-label={linkLabel}
      className="group outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
    >
      <motion.g variants={nodeVariants(node)} className="cursor-pointer">
        {/* Invisible hit target -- the visible marker is a 4px dot, far
            below the 44px touch-target floor (CLAUDE.md a11y DoD). fill
            must be a real paint ("transparent", not "none") for
            pointer-events: visiblePainted (the SVG default) to still
            hit-test it. */}
        <motion.circle cx={node.x} cy={node.y} r="22" fill="transparent" aria-hidden="true" />
        <motion.line
          x1={node.anchorX}
          y1={node.anchorY}
          x2={node.x}
          y2={node.y}
          strokeWidth="1"
          className="stroke-border transition-colors group-hover:stroke-brand group-focus-visible:stroke-brand motion-reduce:transition-none"
        />
        <motion.circle
          cx={node.x}
          cy={node.y}
          r="4"
          className="fill-surface stroke-text-muted stroke-2 transition-colors group-hover:fill-brand-solid group-hover:stroke-brand-solid group-focus-visible:fill-brand-solid group-focus-visible:stroke-brand-solid motion-reduce:transition-none"
        />
        <text
          x={node.x}
          y={node.y + labelDy}
          textAnchor="middle"
          className="fill-text-muted font-mono text-[11px] transition-colors group-hover:fill-brand group-focus-visible:fill-brand"
        >
          {node.code}
        </text>
        <text
          x={node.x}
          y={node.y + nameDy}
          textAnchor="middle"
          style={{ direction: "rtl" }}
          className="pointer-events-none fill-text font-body text-[13px] opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none"
        >
          {node.name.fa}
          {partsCountLabel !== null ? (
            <tspan className="fill-text-muted"> · {partsCountLabel}</tspan>
          ) : null}
        </text>
      </motion.g>
    </a>
  );
}

// masterPlan.md §1.3: SVG assembly separates on load with staggered
// motion, hairline leader lines + mono system codes always visible,
// hover/tap reveals Persian name + part count, click routes into that
// system. §5 motion budget: this is the page's one orchestrated
// page-load sequence, so it plays on mount, not `whileInView` like every
// other section's Reveal wrapper.
//
// `useReducedMotion()` resolves asynchronously (it can't know the real
// media-query state during SSR/first paint) -- it does NOT synchronously
// return true on the very first render for a reduced-motion user. Gating
// `initial` on it directly (`initial={reduceMotion ? false : "hidden"}`)
// is safe specifically because Motion re-evaluates `initial` reactively:
// if the value is still "hidden" for those first ~1 render, the state
// then flips to false before any visible paint, so it never gets stuck
// mid-transition the way toggling `variants` on/off did.
export function ExplodedView({ svgLabel, nodeLabels }: Props) {
  const reduceMotion = useReducedMotion();
  const playIntro = !reduceMotion;

  return (
    <>
      {/* role="group" not "img" -- axe's nested-interactive rule correctly
          flags "img" here since it implies a single static, non-interactive
          image, which conflicts with the real <a> links inside. */}
      <svg
        viewBox={EXPLODED_VIEWBOX}
        role="group"
        aria-label={svgLabel}
        className="hidden w-full md:block"
      >
        <CarSilhouette playIntro={playIntro} />
        <motion.g
          initial={playIntro ? "hidden" : false}
          animate="visible"
          variants={parentVariants}
        >
          {EXPLODED_NODES.map((node) => (
            <Node key={node.code} node={node} {...nodeLabels[node.code]} />
          ))}
        </motion.g>
      </svg>

      {/* masterPlan.md §5 item 01: "collapses to a stacked, tappable list
          on mobile -- same codes, same language, no motion cost." A
          separate list, not a shrunk SVG. */}
      <ul className="flex flex-col divide-y divide-border border-y border-border md:hidden">
        {EXPLODED_NODES.map((node) => (
          <li key={node.code}>
            <a
              href={`/c/${node.slug}`}
              className="flex items-center justify-between gap-3 px-1 py-3 text-body text-text hover:bg-surface-raised"
            >
              <span className="flex items-center gap-3">
                <span className="font-mono text-data text-text-muted">{node.code}</span>
                <span>{node.name.fa}</span>
              </span>
              {nodeLabels[node.code].partsCountLabel !== null ? (
                <span className="text-body-sm text-text-muted">
                  {nodeLabels[node.code].partsCountLabel}
                </span>
              ) : null}
            </a>
          </li>
        ))}
      </ul>
    </>
  );
}
