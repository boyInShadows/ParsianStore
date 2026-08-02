/**
 * Escapes every regex metacharacter so a user-supplied search fragment is
 * matched literally by `$regex` instead of being executed as a pattern.
 *
 * Extracted at P8.S4: this was already inlined identically in
 * MongoSearchProvider and coupons.admin.service, and the new admin catalog
 * search made it a fourth copy — real repetition, not speculative sharing.
 */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
