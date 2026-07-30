"use client"; // reads the client-only garage store and fetches the live fitment verdict

import { useEffect, useState } from "react";
import { buildVehicleKey } from "schemas";
import type { FitmentVerdictDto } from "schemas";
import { selectActiveVehicle, useGarageStore } from "@/stores/garage-store";
import { fetchFitmentCheck } from "@/lib/fetchers/fitment";
import { Badge } from "@/components/primitives";

export interface FitmentBannerMessages {
  exact: string;
  likely: string;
  check: string;
  checkVehicle: string;
}

type Props = {
  productId: string;
  messages: FitmentBannerMessages;
};

// Steel Blue (Badge tone="info", which aliases the brand ramp) owns
// "fitment-verified state" by the two-accent discipline (tokens.css's own
// header comment, masterPlan.md §6.3) -- "exact"/"likely" both read as
// brand-blue "verified compatible" signals, never success-green (fitment
// isn't a completed-purchase or in-stock state). "check" (confidence not
// established) uses the existing outlined warning tone -- deliberately
// never solid, so it can't be mistaken for a CTA (same rule §6.3 already
// enforces elsewhere).
export function FitmentBanner({ productId, messages }: Props) {
  const activeVehicle = useGarageStore(selectActiveVehicle);
  const [verdict, setVerdict] = useState<FitmentVerdictDto | null>(null);

  useEffect(() => {
    // Nothing to check without an active vehicle -- the render below
    // already short-circuits on `!activeVehicle` before ever reading
    // `verdict`, so a stale verdict from a previously-active vehicle
    // never surfaces; no need to reset it here too.
    if (!activeVehicle) return;
    let cancelled = false;
    void fetchFitmentCheck(productId, buildVehicleKey(activeVehicle)).then((result) => {
      if (!cancelled) setVerdict(result);
    });
    return () => {
      cancelled = true;
    };
  }, [activeVehicle, productId]);

  if (!activeVehicle) {
    return <Badge tone="neutral">{messages.checkVehicle}</Badge>;
  }

  if (!verdict || verdict.confidence === null) return null;

  if (verdict.confidence === "check") {
    return <Badge tone="warning">{messages.check}</Badge>;
  }

  return <Badge tone="info">{messages[verdict.confidence]}</Badge>;
}
