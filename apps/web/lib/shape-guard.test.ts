import { describe, expect, it } from "vitest";
import {
  isArrayOf,
  isBoolean,
  isLocalizedName,
  isNumber,
  isOneOf,
  isOptionalString,
  isPlainObject,
  isString,
  isStringArray,
  toValidDate,
} from "./shape-guard";

describe("isPlainObject", () => {
  it("accepts a plain object", () => {
    expect(isPlainObject({ a: 1 })).toBe(true);
  });
  it("rejects an array, null and primitives", () => {
    expect(isPlainObject([])).toBe(false);
    expect(isPlainObject(null)).toBe(false);
    expect(isPlainObject("x")).toBe(false);
    expect(isPlainObject(undefined)).toBe(false);
  });
});

describe("isString / isOptionalString", () => {
  it("isString accepts only strings", () => {
    expect(isString("a")).toBe(true);
    expect(isString(1)).toBe(false);
    expect(isString(undefined)).toBe(false);
    expect(isString(null)).toBe(false);
  });
  it("isOptionalString also accepts undefined, but not null", () => {
    expect(isOptionalString("a")).toBe(true);
    expect(isOptionalString(undefined)).toBe(true);
    expect(isOptionalString(null)).toBe(false);
    expect(isOptionalString(1)).toBe(false);
  });
});

describe("isNumber", () => {
  it("accepts finite numbers only", () => {
    expect(isNumber(0)).toBe(true);
    expect(isNumber(-4.5)).toBe(true);
    expect(isNumber(Number.NaN)).toBe(false);
    expect(isNumber(Number.POSITIVE_INFINITY)).toBe(false);
    expect(isNumber("1")).toBe(false);
  });
});

describe("isBoolean", () => {
  it("accepts only booleans", () => {
    expect(isBoolean(true)).toBe(true);
    expect(isBoolean(false)).toBe(true);
    expect(isBoolean(0)).toBe(false);
    expect(isBoolean("true")).toBe(false);
  });
});

describe("isStringArray", () => {
  it("accepts an array of strings, including empty", () => {
    expect(isStringArray([])).toBe(true);
    expect(isStringArray(["a", "b"])).toBe(true);
  });
  it("rejects a mixed or non-array value", () => {
    expect(isStringArray(["a", 1])).toBe(false);
    expect(isStringArray("a")).toBe(false);
    expect(isStringArray(null)).toBe(false);
  });
});

describe("isOneOf", () => {
  const roles = ["customer", "admin"] as const;
  it("accepts a listed value", () => {
    expect(isOneOf("admin", roles)).toBe(true);
  });
  it("rejects an unlisted string, and any non-string", () => {
    expect(isOneOf("superadmin", roles)).toBe(false);
    expect(isOneOf(1, roles)).toBe(false);
    expect(isOneOf(undefined, roles)).toBe(false);
  });
});

describe("isArrayOf", () => {
  it("accepts an array whose every item passes the guard", () => {
    expect(isArrayOf([1, 2, 3], isNumber)).toBe(true);
  });
  it("rejects an array with one bad item, or a non-array", () => {
    expect(isArrayOf([1, "2", 3], isNumber)).toBe(false);
    expect(isArrayOf("not-an-array", isNumber)).toBe(false);
  });
});

describe("isLocalizedName", () => {
  it("accepts { fa, en } strings", () => {
    expect(isLocalizedName({ fa: "الف", en: "a" })).toBe(true);
  });
  it("rejects a missing or mistyped field", () => {
    expect(isLocalizedName({ fa: "الف" })).toBe(false);
    expect(isLocalizedName({ fa: "الف", en: 1 })).toBe(false);
    expect(isLocalizedName(null)).toBe(false);
  });
});

describe("toValidDate", () => {
  it("coerces a valid ISO string to a Date instance", () => {
    const date = toValidDate("2026-09-15T00:00:00.000Z");
    expect(date).toBeInstanceOf(Date);
    expect(date?.getUTCFullYear()).toBe(2026);
  });
  it("coerces a valid epoch number", () => {
    expect(toValidDate(0)).toBeInstanceOf(Date);
  });
  it("returns undefined for an unparseable string, null, or a non-date type", () => {
    expect(toValidDate("not-a-date")).toBeUndefined();
    expect(toValidDate(null)).toBeUndefined();
    expect(toValidDate(undefined)).toBeUndefined();
    expect(toValidDate({})).toBeUndefined();
  });
});
