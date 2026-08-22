/**
 * masterPlan.md §5 item 07 / fableTasks §5 P9.S13: "Only renders if live deals
 * exist -- never a fake timer."
 *
 * No live-deals data source exists yet, so this renders **nothing at all** --
 * not a section shell, not a heading, not an empty-state card. A husk would be
 * worse than absence twice over: it advertises discounts the store cannot
 * honour, and it leaves a labelled landmark in the accessibility tree that
 * leads nowhere. `e2e/landing-sections.spec.ts` asserts the absence, so the day
 * this starts rendering a shell is the day a test fails.
 *
 * The `Landing.beats.deals` copy is already authored and waiting; the real
 * wiring (a Jalali-aware countdown against live deal data) lands with the deals
 * data source.
 */
export function Deals() {
  return null;
}
