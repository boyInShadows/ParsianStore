import cron, { type ScheduledTask } from "node-cron";
import { logger } from "../config/logger.js";
import { deleteExpiredOtps } from "../modules/auth/auth.service.js";
import { releaseExpiredReservations } from "../modules/inventory/inventory.service.js";

/**
 * The scheduled half of two things PostgreSQL cannot do for itself.
 *
 * Mongo carried TTL indexes on `StockReservation.expiresAt` and
 * `OtpToken.expiresAt`; PostgreSQL has no such feature, so both sweeps are
 * application work now. They differ in what is at stake, which is why both
 * are here rather than only the noisy one: an unswept reservation keeps
 * stock off the shelf forever (a correctness bug a customer would feel),
 * while unswept OTP rows merely accumulate.
 *
 * Started only from server.ts (never app.ts, which every test file also
 * imports — a live interval ticking during the test suite would be both
 * pointless and a source of open-handle warnings/flakiness).
 */
export function scheduleInventoryJobs(): ScheduledTask {
  return cron.schedule("* * * * *", () => {
    releaseExpiredReservations()
      .then((count) => {
        if (count > 0) {
          logger.info({ count }, "Released expired stock reservations");
        }
      })
      .catch((err: unknown) => {
        logger.error({ err }, "Failed to release expired stock reservations");
      });

    deleteExpiredOtps()
      .then((count) => {
        if (count > 0) {
          logger.info({ count }, "Deleted expired OTP tokens");
        }
      })
      .catch((err: unknown) => {
        logger.error({ err }, "Failed to delete expired OTP tokens");
      });
  });
}
