// masterPlan.md §5 item 07: "Only renders if live deals exist — never a
// fake timer." No live-deals data source exists yet; real wiring
// (Jalali-aware countdown against real deal data) lands in P4.S4. The
// `Landing.sections.deals` message keys are already authored and ready for
// that step -- rendering null here, not a placeholder, is the honest
// behavior in the meantime.
export function Deals() {
  return null;
}
