import { z } from "zod";

/**
 * The one definition of "a valid entity id" for the whole monorepo.
 *
 * Before the PostgreSQL migration this was a 24-hex MongoDB `ObjectId`,
 * re-declared as a local `objectId` const in twenty-seven separate files. Ids
 * are now UUID v7 (`@default(uuid(7))` in `schema.prisma`) -- time-ordered, so
 * they index and paginate like a sequence while staying globally unique, where
 * a v4 would scatter inserts across the B-tree.
 *
 * Validated as *any* UUID rather than pinned to the v7 version nibble on
 * purpose: the version is a storage detail this project may revisit, while the
 * thing every caller actually needs to reject is a malformed id. Note that
 * `.uuid()` only accepts v7 on zod >= 3.24 -- the older regex hardcoded `[1-5]`
 * in the version position and would reject every id this database generates.
 *
 * The Persian message is deliberate: this reaches users through the `{ ok,
 * error }` envelope, and every user-facing string in this project is real
 * Persian copy.
 */
export const idSchema = z.string().uuid("شناسه معتبر نیست");

export type Id = z.infer<typeof idSchema>;
