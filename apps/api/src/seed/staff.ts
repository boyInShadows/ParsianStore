import { pathToFileURL } from "node:url";
import { normalizePhone } from "schemas";
import { connectDB, disconnectDB } from "../config/db.js";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { UserModel } from "../models/User.js";

/**
 * Idempotent: safe to run on every deploy. Seeds exactly one superadmin
 * from ADMIN_SEED_PHONE so there's always a way into the admin panel
 * without a manual database write. Real staff-role assignment for
 * everyone else is an admin-panel action (Phase 8), not this script's job.
 */
export async function seedStaff(phone: string | undefined = env.ADMIN_SEED_PHONE): Promise<void> {
  if (!phone) {
    logger.warn("ADMIN_SEED_PHONE not set — skipping staff seed");
    return;
  }

  const normalizedPhone = normalizePhone(phone);
  const existing = await UserModel.findOne({ phone: normalizedPhone });
  if (existing) {
    logger.info({ phone: normalizedPhone }, "Staff seed: superadmin already exists, skipping");
    return;
  }

  await UserModel.create({
    phone: normalizedPhone,
    name: "مدیر سیستم",
    role: "superadmin",
  });
  logger.info({ phone: normalizedPhone }, "Staff seed: superadmin created");
}

// Only run as a side effect when executed directly (`tsx src/seed/staff.ts`
// / `node dist/seed/staff.js`) — importing seedStaff() elsewhere (tests)
// must not trigger a real DB connection as an import side effect.
//
// Naive `import.meta.url === \`file://${process.argv[1]}\`` breaks on
// Windows: argv[1] is a backslash path ("D:\..."), not a file:// URL, so
// the two never match and this block silently never runs at all — found
// by actually executing the script and checking the database, not just
// trusting a clean exit code. pathToFileURL() normalizes argv[1] the same
// way Node derived import.meta.url, on every platform.
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  connectDB()
    .then(() => seedStaff())
    .then(() => disconnectDB())
    .catch((err: unknown) => {
      logger.error({ err }, "Staff seed failed");
      process.exit(1);
    });
}
