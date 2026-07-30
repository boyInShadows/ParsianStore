import { pathToFileURL } from "node:url";
import { connectDB, disconnectDB } from "../config/db.js";
import { logger } from "../config/logger.js";
import { COUPON_TYPES, CouponModel, type CouponType } from "../models/Coupon.js";

// P6.S7's sanctioned mechanism for "admin creates a coupon" (same
// reasoning as scripts/setAccountType.ts, P6.S1 -- no admin CRUD UI
// exists yet, stays Phase 8 scope). Usage:
//   pnpm --filter api exec tsx src/scripts/createCoupon.ts <code> <percent|fixed> <value> \
//     [--minSubtotal=N] [--maxDiscount=N] [--usageLimit=N] [--perUserLimit=N] \
//     [--startsAt=ISO] [--endsAt=ISO]
export interface CreateCouponOptions {
  minSubtotalRial?: number;
  maxDiscountRial?: number;
  usageLimit?: number;
  perUserLimit?: number;
  startsAt?: Date;
  endsAt?: Date;
}

export async function createCoupon(
  rawCode: string,
  type: CouponType,
  value: number,
  options: CreateCouponOptions = {},
): Promise<void> {
  const code = rawCode.trim().toUpperCase();
  const coupon = await CouponModel.create({ code, type, value, ...options });
  logger.info({ code: coupon.code, type: coupon.type, value: coupon.value }, "Coupon created");
}

function parseFlags(args: string[]): CreateCouponOptions {
  const options: CreateCouponOptions = {};
  for (const arg of args) {
    const [rawKey, rawValue] = arg.replace(/^--/, "").split("=");
    if (!rawKey || !rawValue) continue;
    switch (rawKey) {
      case "minSubtotal":
        options.minSubtotalRial = Number(rawValue);
        break;
      case "maxDiscount":
        options.maxDiscountRial = Number(rawValue);
        break;
      case "usageLimit":
        options.usageLimit = Number(rawValue);
        break;
      case "perUserLimit":
        options.perUserLimit = Number(rawValue);
        break;
      case "startsAt":
        options.startsAt = new Date(rawValue);
        break;
      case "endsAt":
        options.endsAt = new Date(rawValue);
        break;
      default:
        break;
    }
  }
  return options;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const [, , rawCode, rawType, rawValue, ...rest] = process.argv;
  if (!rawCode || !COUPON_TYPES.includes(rawType as CouponType) || !rawValue) {
    logger.error(
      { couponTypes: COUPON_TYPES },
      "Usage: tsx src/scripts/createCoupon.ts <code> <percent|fixed> <value> [--minSubtotal=N] [--maxDiscount=N] [--usageLimit=N] [--perUserLimit=N] [--startsAt=ISO] [--endsAt=ISO]",
    );
    process.exit(1);
  }
  const options = parseFlags(rest);
  connectDB()
    .then(() => createCoupon(rawCode, rawType as CouponType, Number(rawValue), options))
    .then(() => disconnectDB())
    .catch((err: unknown) => {
      logger.error({ err }, "createCoupon failed");
      process.exit(1);
    });
}
