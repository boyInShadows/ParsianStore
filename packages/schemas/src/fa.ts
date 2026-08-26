import dayjs from "dayjs";
import jalaliPlugin from "jalaliday/dayjs";
import "dayjs/locale/fa.js";

dayjs.extend(jalaliPlugin);

// Everything that does NOT need dayjs lives in faText.ts and is re-exported
// here, so `import { formatToman, normalizeFa } from "schemas"` is unchanged
// for every existing call site. A client component that only formats money
// or digits should import "schemas/fa-text" directly instead -- this module
// drags the whole date stack in for `formatJalali`'s sake.
export {
  toEnglishDigits,
  toPersianDigits,
  normalizeFa,
  normalizePhone,
  normalizePostalCode,
  formatToman,
} from "./faText.js";

/**
 * The ONE formatter for displaying dates (§ date rule). Storage stays UTC
 * ISO always — this only ever runs at render time, never before a write.
 */
export function formatJalali(date: Date | string, pattern: string): string {
  return dayjs(date).calendar("jalali").locale("fa").format(pattern);
}
