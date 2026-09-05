import { clsx, type ClassValue } from "clsx";

export type { ClassValue };

/**
 * `cx()` -- join class names, without the Tailwind merge. The client-side
 * sibling of `cn()` (lib/cn.ts), and a deliberately separate module.
 *
 * ## Why this exists at all
 *
 * `cn()` pulls in tailwind-merge, and tailwind-merge is **7 KB gzipped on
 * every route that reaches it from a Client Component** -- measured by
 * stubbing the merge out and rebuilding: the landing route went 200 KB ->
 * 193 KB. Four client primitives (Drawer, SearchField, Tabs, Toast) imported
 * `cn()`, three of them live in the header, and the header renders on every
 * route, so the whole app carried it.
 *
 * Being a separate file is the entire mechanism. Exporting `cx` from
 * `lib/cn.ts` would change nothing: importing any binding from that module
 * pulls the module, and the module pulls tailwind-merge.
 *
 * ## When each one is correct
 *
 * `cn()` exists because a caller's `className` has to be able to beat a
 * component's own variant (P11.S2 -- `<Button className="bg-surface">` used
 * to lose to the variant's `bg-brand-solid`). That is a real bug and `cn()`
 * is the fix, so:
 *
 * - **A component that accepts a `className` prop must use `cn()`.** No
 *   exceptions, Server or Client -- the merge is the whole point.
 * - **A component that only composes its own classes may use `cx()`**, and
 *   in a Client Component it should. There is no caller to lose an
 *   argument, and the only question is whether the component's own strings
 *   conflict with each other -- which the author can see, and which
 *   `cx.test.ts` pins for every site that has made this trade.
 *
 * That test asserts `cn(...) === cx(...)` for each of those compositions, so
 * the day one of them grows a genuinely conflicting utility it fails and
 * says to move that site back to `cn()` rather than shipping a silently
 * wrong class attribute.
 */
export function cx(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
