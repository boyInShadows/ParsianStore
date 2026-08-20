import type { AbstractIntlMessages } from "next-intl";

import en from "../messages/en.json";
import fa from "../messages/fa.json";

import { routing } from "./routing";

type Locale = (typeof routing.locales)[number];

/**
 * next-intl's own `AbstractIntlMessages` models a catalog as strings nested in
 * objects and has no array case, but the runtime carries arrays fine and this
 * project relies on them -- `t.raw("items")` reads the symptom list, the trust
 * claims and the how-it-works steps. So the merge is typed against the real
 * shape and cast once, at the single boundary where next-intl receives it.
 */
type MessageValue = string | readonly MessageValue[] | { readonly [key: string]: MessageValue };
type MessageTree = { readonly [key: string]: MessageValue };

const CATALOGS: Record<Locale, MessageTree> = { fa, en };

function isTree(value: MessageValue | undefined): value is MessageTree {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * `fa` under, the requested locale over. A key present in the requested catalog
 * always wins; a key missing there falls through to the Persian one.
 *
 * Arrays are replaced wholesale rather than merged element-by-element: these
 * are ordered lists of copy, so an index-wise merge would splice two languages
 * into one list.
 */
function merge(base: MessageTree, override: MessageTree): MessageTree {
  const merged: Record<string, MessageValue> = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const fallback = merged[key];
    merged[key] = isTree(value) && isTree(fallback) ? merge(fallback, value) : value;
  }
  return merged;
}

/**
 * masterPlan.md §7.1 architects `en` from day one, and the owner suspended
 * `fa`/`en` key parity on 2026-07-30 while keeping `en` routing in place. Those
 * two facts collide the moment a namespace ships Persian-only: next-intl has no
 * built-in fallback, so `/en/...` would raise a missing-message error for every
 * key `en.json` has not caught up on -- a broken page rather than an
 * untranslated one. Layering `fa` underneath makes the worst case "this string
 * is still in Persian", which is the honest state of the translation anyway.
 *
 * A fallback, not a substitute for translating: every key `en.json` does define
 * still wins, so reviving `en` (tasks.md deferred list) means filling that file
 * in, with no change here.
 */
export function getMessages(locale: Locale): AbstractIntlMessages {
  const tree =
    locale === routing.defaultLocale
      ? CATALOGS[locale]
      : merge(CATALOGS[routing.defaultLocale], CATALOGS[locale]);
  return tree as unknown as AbstractIntlMessages;
}
