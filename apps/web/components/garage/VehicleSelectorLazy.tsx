"use client"; // ssr:false is only permitted from a Client Component boundary

import dynamic from "next/dynamic";

// masterPlan.md §10: "Framer Motion, Swiper, and MUI X are dynamically
// imported." @tanstack/react-query pushed the landing route's First Load
// JS from 172KB to 193KB, over the 180KB budget. `ssr: false` is what
// actually excludes it from that number (not just `dynamic()` alone --
// without `ssr:false` the chunk still loads as part of initial
// hydration, since VehicleSelector renders unconditionally, not behind a
// user interaction): VehicleSelector (and react-query with it) now
// renders client-side only, after the initial paint. `loading` renders a
// same-size skeleton so there's no layout shift once the real selects
// mount (§10 CLS budget).
export const VehicleSelectorLazy = dynamic(
  () => import("./VehicleSelector").then((mod) => mod.VehicleSelector),
  { ssr: false, loading: () => <VehicleSelectorSkeleton /> },
);

function VehicleSelectorSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-hidden="true">
      {["خودرو", "مدل", "سال تولید"].map((label) => (
        <div key={label} className="flex flex-col gap-1">
          <span className="text-body-sm font-medium text-text">{label}</span>
          <div className="h-[42px] animate-pulse rounded-md border border-border bg-surface-raised" />
        </div>
      ))}
    </div>
  );
}
