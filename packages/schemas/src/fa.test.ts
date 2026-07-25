import { describe, expect, it } from "vitest";
import {
  formatJalali,
  formatToman,
  normalizeFa,
  normalizePhone,
  toEnglishDigits,
  toPersianDigits,
} from "./fa.js";

describe("toEnglishDigits", () => {
  it("converts Persian digits to ASCII", () => {
    expect(toEnglishDigits("۱۲۳۴۵۶۷۸۹۰")).toBe("1234567890");
  });

  it("converts Arabic-Indic digits to ASCII", () => {
    expect(toEnglishDigits("٠١٢٣٤٥٦٧٨٩")).toBe("0123456789");
  });

  it("leaves non-digit characters untouched", () => {
    expect(toEnglishDigits("قیمت: ۱۲۵۰۰ تومان")).toBe("قیمت: 12500 تومان");
  });
});

describe("toPersianDigits", () => {
  it("converts ASCII digits in a number", () => {
    expect(toPersianDigits(125000)).toBe("۱۲۵۰۰۰");
  });

  it("converts ASCII digits inside a larger string, leaving other characters alone", () => {
    expect(toPersianDigits("SKU-0442")).toBe("SKU-۰۴۴۲");
  });
});

describe("normalizeFa", () => {
  it("maps Arabic letterforms to their Persian equivalents", () => {
    // ي (Arabic yeh) -> ی, ك (Arabic kaf) -> ک, ة (Arabic teh marbuta) -> ه
    expect(normalizeFa("علي")).toBe("علی");
    expect(normalizeFa("پاكت")).toBe("پاکت");
    expect(normalizeFa("علامة")).toBe("علامه");
  });

  it("converts Persian and Arabic-Indic digits to ASCII", () => {
    expect(normalizeFa("مدل ۱۴۰۳")).toBe("مدل 1403");
    expect(normalizeFa("مدل ١٤٠٣")).toBe("مدل 1403");
  });

  it("collapses repeated ZWNJ and drops it next to real whitespace", () => {
    expect(normalizeFa("می‌‌رود")).toBe("می‌رود"); // repeated ZWNJ -> one
    expect(normalizeFa("می‌ رود")).toBe("می رود"); // ZWNJ beside a space is noise
  });

  it("collapses whitespace runs and trims", () => {
    expect(normalizeFa("  لنت   ترمز  ")).toBe("لنت ترمز");
  });

  it("lowercases Latin characters but leaves Persian script untouched", () => {
    expect(normalizeFa("Bosch لنت")).toBe("bosch لنت");
  });

  it("normalizes the same text two different users might type identically, for search", () => {
    // One user types with Arabic ي/ك and Arabic-Indic digits (common on
    // some keyboards/OCR sources); another types "correct" Persian. Both
    // must normalize to the same stored/queried string or search breaks.
    expect(normalizeFa("كارتك ١٢٣")).toBe(normalizeFa("کارتک ۱۲۳"));
  });
});

describe("normalizePhone", () => {
  it.each([
    ["09123456789", "+989123456789"],
    ["+989123456789", "+989123456789"],
    ["00989123456789", "+989123456789"],
    ["989123456789", "+989123456789"],
    ["9123456789", "+989123456789"],
    ["0912-345-6789", "+989123456789"],
    ["۰۹۱۲۳۴۵۶۷۸۹", "+989123456789"],
  ])("normalizes %s to %s", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });
});

describe("formatToman", () => {
  it("divides Rial by 10 and appends the Toman suffix in Persian digits", () => {
    expect(formatToman(1250000)).toBe("۱۲۵٬۰۰۰ تومان");
  });

  it("groups large amounts every 3 digits", () => {
    expect(formatToman(123456780)).toBe("۱۲٬۳۴۵٬۶۷۸ تومان");
  });

  it("truncates toward zero when Rial isn't a multiple of 10", () => {
    expect(formatToman(1235)).toBe("۱۲۳ تومان");
  });

  it("handles a negative amount (e.g. a refund/adjustment)", () => {
    expect(formatToman(-50000)).toBe("-۵٬۰۰۰ تومان");
  });

  it("throws on a non-integer Rial value instead of silently rounding money", () => {
    expect(() => formatToman(1250000.5)).toThrow();
  });
});

describe("formatJalali", () => {
  it("converts Nowruz 1403 (2024-03-20, the real Iranian new year) correctly", () => {
    // Verifiable against any Persian calendar: 1403's equinox fell at
    // 2024-03-20 03:06 UTC, so noon UTC the same day is safely into the
    // new Jalali year regardless of the runner's local timezone.
    expect(formatJalali("2024-03-20T12:00:00Z", "YYYY-MM-DD")).toBe("1403-01-01");
  });

  it("formats a Persian month name via the fa locale", () => {
    expect(formatJalali("2024-03-20T12:00:00Z", "D MMMM YYYY")).toBe("1 فروردین 1403");
  });
});
