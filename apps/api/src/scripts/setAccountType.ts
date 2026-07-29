import { pathToFileURL } from "node:url";
import { normalizePhone } from "schemas";
import { connectDB, disconnectDB } from "../config/db.js";
import { logger } from "../config/logger.js";
import { ACCOUNT_TYPES, UserModel, type AccountType } from "../models/User.js";

// P6.S1's sanctioned mechanism for "admin manually flags an account as
// wholesale" (owner's explicit choice -- no self-service application flow,
// no admin CRUD UI yet). Usage:
//   pnpm --filter api exec tsx src/scripts/setAccountType.ts <phone> wholesale
//   pnpm --filter api exec tsx src/scripts/setAccountType.ts <phone> retail
export async function setAccountType(rawPhone: string, accountType: AccountType): Promise<void> {
  const phone = normalizePhone(rawPhone);
  const user = await UserModel.findOneAndUpdate({ phone }, { accountType }, { new: true });
  if (!user) {
    throw new Error(`No user found for phone ${phone} -- they must sign up (OTP) first.`);
  }
  logger.info({ phone, accountType: user.accountType, userId: user.id }, "Account type updated");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const [, , rawPhone, rawAccountType] = process.argv;
  if (!rawPhone || !ACCOUNT_TYPES.includes(rawAccountType as AccountType)) {
    logger.error(
      { accountTypes: ACCOUNT_TYPES },
      "Usage: tsx src/scripts/setAccountType.ts <phone> <retail|wholesale>",
    );
    process.exit(1);
  }
  connectDB()
    .then(() => setAccountType(rawPhone, rawAccountType as AccountType))
    .then(() => disconnectDB())
    .catch((err: unknown) => {
      logger.error({ err }, "setAccountType failed");
      process.exit(1);
    });
}
