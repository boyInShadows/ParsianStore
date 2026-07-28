import dayjs from "dayjs";
import jalaliPlugin from "jalaliday/dayjs";
import "dayjs/locale/fa.js";

dayjs.extend(jalaliPlugin);

const PERSIAN_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"] as const;

// Arabic-Indic (٠-٩) and Persian (۰-۹) digits, both seen from real Persian
// keyboards/OCR — every numeric input must accept both (§7.5).
const DIGIT_TO_ASCII: Record<string, string> = {
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
  "۰": "0",
  "۱": "1",
  "۲": "2",
  "۳": "3",
  "۴": "4",
  "۵": "5",
  "۶": "6",
  "۷": "7",
  "۸": "8",
  "۹": "9",
};

/** Input sanitization — run on EVERY numeric field's onChange (§7.5). */
export function toEnglishDigits(input: string): string {
  return input.replace(/[٠-٩۰-۹]/g, (digit) => DIGIT_TO_ASCII[digit] ?? digit);
}

/** Display only — never store or compare the result of this. */
export function toPersianDigits(value: number | string): string {
  return String(value).replace(/[0-9]/g, (digit) => PERSIAN_DIGITS[Number(digit)] ?? digit);
}

/**
 * Canonical form for storage AND search (§7.5, §8.3). Applied to both the
 * indexed `searchText` field and every incoming query string — normalizing
 * only one side is the single most common reason Persian search breaks.
 */
export function normalizeFa(input: string): string {
  let result = input;
  // Arabic letterforms that visually resemble Persian ones but are
  // different code points — ي/ك/ة (Arabic) vs ی/ک/ه (Persian).
  result = result.replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/ة/g, "ه");
  result = toEnglishDigits(result);
  // ZWNJ (nim-fasele, ‌): collapse runs to one, and drop it entirely
  // when it sits next to real whitespace — that combination is noise, not
  // an intentional half-space (e.g. from copy-pasted or OCR'd text).
  result = result.replace(/‌+/g, "‌");
  result = result.replace(/‌(?=\s)/g, "").replace(/(?<=\s)‌/g, "");
  result = result.replace(/\s+/g, " ").trim();
  // Only affects Latin letters — Persian script has no case distinction.
  result = result.toLowerCase();
  return result;
}

/**
 * → +989XXXXXXXXX. Accepts the shapes people actually type/paste: leading
 * 0, +98, 0098, or bare 10-digit, with Persian/Arabic-Indic digits.
 */
export function normalizePhone(input: string): string {
  const digitsOnly = toEnglishDigits(input).replace(/[^\d+]/g, "");
  let national = digitsOnly.replace(/^\+/, "");
  if (national.startsWith("0098")) {
    national = national.slice(4);
  } else if (national.startsWith("98")) {
    national = national.slice(2);
  } else if (national.startsWith("0")) {
    national = national.slice(1);
  }
  return `+98${national}`;
}

const TOMAN_SUFFIX = " تومان";

/**
 * The ONE formatter for displaying money (§ money rule — CLAUDE.md,
 * masterPlan.md §3.2). Rial is stored; Toman is what Iranian shoppers
 * read, so this divides by 10 and never the other way around.
 */
export function formatToman(rial: number): string {
  if (!Number.isInteger(rial)) {
    throw new Error(`formatToman expects an integer Rial amount, got ${rial}`);
  }
  const toman = Math.trunc(rial / 10);
  const grouped = Math.abs(toman)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, "٬");
  const signed = toman < 0 ? `-${grouped}` : grouped;
  return `${toPersianDigits(signed)}${TOMAN_SUFFIX}`;
}

/**
 * The ONE formatter for displaying dates (§ date rule). Storage stays UTC
 * ISO always — this only ever runs at render time, never before a write.
 */
export function formatJalali(date: Date | string, pattern: string): string {
  return dayjs(date).calendar("jalali").locale("fa").format(pattern);
}
