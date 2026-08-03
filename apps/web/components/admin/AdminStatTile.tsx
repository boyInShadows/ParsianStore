"use client"; // Rendered inside the client-side dashboard shell, and the
// hover/focus treatment below is a real interactive state.

import type { ReactNode } from "react";
import { Box, Paper, Stack, Typography, alpha } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import { toPersianDigits } from "schemas";

/**
 * P8.S5. The dashboard's unit of hierarchy. Deliberately NOT a uniform
 * card: `emphasis="hero"` is a genuinely different object -- bigger type,
 * a tinted surface, room for a chart bleeding to its own edges -- so the
 * revenue figure reads as the headline rather than one of four equal
 * boxes (web/design-quality.md's "clear hierarchy through scale contrast",
 * and its ban on uniform card grids).
 */
export type StatDelta =
  { kind: "change"; percent: number } | { kind: "new" } | { kind: "flat" } | null;

type Props = {
  label: string;
  value: string;
  /** Small print under the value -- the absolute comparison, not a repeat. */
  caption?: string;
  delta?: StatDelta;
  emphasis?: "hero" | "normal";
  /** Bleeds to the tile's own edges (a sparkline), never boxed inside it. */
  visual?: ReactNode;
};

/**
 * A percentage change is only meaningful against a non-zero base. Going
 * from 0 to anything is "new", not "+∞%", and 0-to-0 is nothing at all --
 * both are shown as what they are rather than as a fake number.
 */
export function toDelta(current: number, previous: number): StatDelta {
  if (previous === 0) return current === 0 ? null : { kind: "new" };
  const percent = Math.round(((current - previous) / previous) * 100);
  return percent === 0 ? { kind: "flat" } : { kind: "change", percent };
}

function DeltaBadge({ delta }: { delta: StatDelta }) {
  if (!delta) return null;

  if (delta.kind === "new") {
    return (
      <Box component="span" sx={badgeSx("success")}>
        تازه
      </Box>
    );
  }
  if (delta.kind === "flat") {
    return (
      <Box component="span" sx={badgeSx("neutral")}>
        بدون تغییر
      </Box>
    );
  }

  const isUp = delta.percent > 0;
  return (
    <Box component="span" sx={badgeSx(isUp ? "success" : "error")}>
      {/* The arrow is decorative next to a signed number that already says
          the direction, so it is hidden from assistive tech rather than
          read out as a bare glyph. */}
      <Box component="span" aria-hidden="true" sx={{ fontSize: "0.9em", lineHeight: 1 }}>
        {isUp ? "▲" : "▼"}
      </Box>
      {toPersianDigits(Math.abs(delta.percent))}٪
    </Box>
  );
}

function badgeSx(tone: "success" | "error" | "neutral"): SxProps<Theme> {
  const base = {
    display: "inline-flex",
    alignItems: "center",
    gap: 0.5,
    paddingInline: 0.75,
    paddingBlock: 0.25,
    borderRadius: 999,
    fontSize: "0.75rem",
    fontWeight: 700,
    lineHeight: 1.6,
    whiteSpace: "nowrap",
    border: 1,
  } as const;

  if (tone === "neutral") {
    return { ...base, color: "text.secondary", borderColor: "divider" };
  }

  // Scheme-split rather than one shared value: `success.main` on its own
  // 12% wash measures 2.88:1 in the light palette (axe, on the real
  // screen) and only clears 4.5:1 once darkened -- but that same darkened
  // green is muddy on the dark surface, where `.main` already passes
  // comfortably. `applyStyles` is the cssVariables-safe way to say that;
  // a `theme.palette.mode` branch would be evaluated once at render and
  // bake in whichever scheme happened to be active.
  return (theme: Theme) => ({
    ...base,
    // A tinted wash of the same semantic color, so up/down reads at a
    // glance without a second legend -- color carrying meaning, not
    // decoration (design-quality.md).
    backgroundColor: alpha(theme.palette[tone].main, 0.12),
    borderColor: "transparent",
    color: theme.palette[tone].dark,
    ...theme.applyStyles("dark", { color: theme.palette[tone].main }),
  });
}

export function AdminStatTile({
  label,
  value,
  caption,
  delta = null,
  emphasis = "normal",
  visual,
}: Props) {
  const isHero = emphasis === "hero";

  return (
    <Paper
      elevation={0}
      sx={{
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        border: 1,
        borderColor: "divider",
        // Deliberately unequal: the hero tile gets more air than the three
        // beside it, which is what makes the row read as 1+3 rather than 4.
        p: isHero ? 3 : 2.5,
        pb: isHero && visual ? 0 : undefined,
        // A tinted surface, not a second white box -- depth by layering
        // (design-quality.md) rather than by another border.
        background: isHero
          ? (theme) =>
              `linear-gradient(160deg, ${alpha(theme.palette.primary.main, 0.14)}, ${alpha(
                theme.palette.primary.main,
                0.02,
              )})`
          : undefined,
        transition: "border-color 180ms ease, box-shadow 180ms ease",
        "&:hover": { borderColor: "primary.main" },
        "@media (prefers-reduced-motion: reduce)": { transition: "none" },
      }}
    >
      <Stack
        direction="row"
        sx={{ alignItems: "flex-start", justifyContent: "space-between", gap: 1 }}
      >
        <Typography
          // h2, not h3: the page's only h1 is the dashboard title and the
          // panels below are h2 as well -- an h3 here skips a level and axe
          // rightly flags it (heading-order).
          component="h2"
          sx={{
            fontSize: "0.8125rem",
            fontWeight: 600,
            letterSpacing: "0.04em",
            color: "text.secondary",
          }}
        >
          {label}
        </Typography>
        <DeltaBadge delta={delta} />
      </Stack>

      <Typography
        component="p"
        sx={{
          mt: isHero ? 1.5 : 1,
          // The display face (Estedad) rather than the body face -- Persian
          // numerals at this size are the one place on the screen where
          // typographic character actually shows.
          fontFamily: "var(--font-display)",
          fontWeight: 900,
          lineHeight: 1.15,
          letterSpacing: "-0.01em",
          fontSize: isHero ? "clamp(1.75rem, 1.2rem + 2.2vw, 2.75rem)" : "1.5rem",
          color: "text.primary",
        }}
      >
        {value}
      </Typography>

      {caption ? (
        <Typography sx={{ mt: 0.5, fontSize: "0.8125rem", color: "text.secondary" }}>
          {caption}
        </Typography>
      ) : null}

      {visual ? (
        <Box
          sx={{
            mt: "auto",
            pt: 2,
            // Cancels the Paper's own inline padding so the sparkline runs
            // edge to edge instead of sitting in a padded well.
            marginInline: -3,
            marginBlockEnd: 0,
          }}
        >
          {visual}
        </Box>
      ) : null}
    </Paper>
  );
}
