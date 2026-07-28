import cron, { type ScheduledTask } from "node-cron";
import { logger } from "../config/logger.js";
import { releaseExpiredReservations } from "../modules/inventory/inventory.service.js";

/**
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
  });
}
