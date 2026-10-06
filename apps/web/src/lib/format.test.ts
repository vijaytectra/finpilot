import { describe, expect, it } from "vitest";

import {
  formatDate,
  formatMoney,
  formatMoneyCompact,
  formatMonth,
  formatPercent,
  formatQuantity,
  formatSignedMoney,
  fromIsoDate,
  humanizeEnum,
  toIsoDate,
} from "@/lib/format";

describe("formatMoney", () => {
  it("uses the rupee symbol and Indian digit grouping", () => {
    expect(formatMoney(52754963.6)).toBe("₹5,27,54,963.60");
    expect(formatMoney(1234.5)).toBe("₹1,234.50");
    expect(formatMoney(0)).toBe("₹0.00");
  });

  it("renders a dash for missing values", () => {
    expect(formatMoney(null)).toBe("—");
    expect(formatMoney(undefined)).toBe("—");
  });
});

describe("formatMoneyCompact", () => {
  it("uses crore and lakh suffixes", () => {
    expect(formatMoneyCompact(52754963.6)).toBe("₹5.28 Cr");
    expect(formatMoneyCompact(1245000)).toBe("₹12.45 L");
    expect(formatMoneyCompact(100000)).toBe("₹1.00 L");
    expect(formatMoneyCompact(8500)).toBe("₹8.50 K");
    expect(formatMoneyCompact(950)).toBe("₹950");
  });

  it("keeps the sign for negative values", () => {
    expect(formatMoneyCompact(-1245000)).toBe("-₹12.45 L");
  });
});

describe("formatSignedMoney", () => {
  it("prefixes gains with + and losses with -", () => {
    expect(formatSignedMoney(5143.89)).toBe("+₹5,143.89");
    expect(formatSignedMoney(-12528.7)).toBe("-₹12,528.70");
    expect(formatSignedMoney(0)).toBe("₹0.00");
  });
});

describe("formatPercent", () => {
  it("formats to two decimals with optional sign", () => {
    expect(formatPercent(83.75)).toBe("83.75%");
    expect(formatPercent(8.97, { signed: true })).toBe("+8.97%");
    expect(formatPercent(-2.69, { signed: true })).toBe("-2.69%");
    expect(formatPercent(null)).toBe("—");
  });
});

describe("formatQuantity", () => {
  it("keeps up to four decimals for fractional units", () => {
    expect(formatQuantity(149.506)).toBe("149.506");
    expect(formatQuantity(123456.12345)).toBe("1,23,456.1235");
  });
});

describe("dates", () => {
  it("formats ISO dates as `18 Sep 2026` without timezone drift", () => {
    expect(formatDate("2026-09-18")).toBe("18 Sep 2026");
    expect(formatDate("2026-01-01")).toBe("1 Jan 2026");
    expect(formatDate("2026-10-06T23:59:59Z")).toBe("6 Oct 2026");
    expect(formatDate("not-a-date")).toBe("—");
    expect(formatDate(null)).toBe("—");
  });

  it("formats months", () => {
    expect(formatMonth("2026-09-01")).toBe("Sep 2026");
  });

  it("round-trips local calendar dates", () => {
    const date = fromIsoDate("2026-02-28");
    expect(date).toBeDefined();
    expect(toIsoDate(date as Date)).toBe("2026-02-28");
  });
});

describe("humanizeEnum", () => {
  it("turns API enums into sentence case", () => {
    expect(humanizeEnum("HOME_PURCHASE")).toBe("Home purchase");
    expect(humanizeEnum("EQUITY")).toBe("Equity");
  });
});
