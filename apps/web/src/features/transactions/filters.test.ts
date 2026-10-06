import { describe, expect, it } from "vitest";

import { buildQueryString } from "@/lib/api/client";

import { countActiveFilters, parseTransactionFilters, toTransactionQuery } from "./filters";

const parse = (qs: string) => parseTransactionFilters(new URLSearchParams(qs));

describe("parseTransactionFilters", () => {
  it("applies defaults for an empty URL", () => {
    expect(parse("")).toEqual({
      date_from: undefined,
      date_to: undefined,
      account_id: undefined,
      instrument_id: undefined,
      transaction_type: [],
      status: [],
      sort: "-trade_date",
      page: 1,
      page_size: 25,
    });
  });

  it("reads repeated type/status keys in canonical order without duplicates", () => {
    const f = parse("type=SELL&type=BUY&type=SELL&status=REVERSED&status=PENDING");
    expect(f.transaction_type).toEqual(["BUY", "SELL"]);
    expect(f.status).toEqual(["PENDING", "REVERSED"]);
  });

  it("drops malformed values instead of sending them to the API", () => {
    const f = parse(
      "date_from=2026-13&date_to=yesterday&account_id=X1&instrument_id=I0013&type=SWAP&status=LOST&sort=price&page=-2",
    );
    expect(f.date_from).toBeUndefined();
    expect(f.date_to).toBeUndefined();
    expect(f.account_id).toBeUndefined();
    expect(f.instrument_id).toBe("I0013");
    expect(f.transaction_type).toEqual([]);
    expect(f.status).toEqual([]);
    expect(f.sort).toBe("-trade_date");
    expect(f.page).toBe(1);
  });
});

describe("toTransactionQuery", () => {
  it("maps URL filters to the API query string with repeated array keys", () => {
    const filters = parse(
      "date_from=2026-01-01&date_to=2026-06-30&account_id=A00012&type=BUY&type=DIVIDEND&status=PENDING&status=REVERSED&sort=-amount&page=3",
    );
    expect(buildQueryString(toTransactionQuery(filters))).toBe(
      "?date_from=2026-01-01&date_to=2026-06-30&account_id=A00012" +
        "&transaction_type=BUY&transaction_type=DIVIDEND&status=PENDING&status=REVERSED" +
        "&sort=-amount&page=3&page_size=25",
    );
  });

  it("omits unset filters entirely", () => {
    expect(buildQueryString(toTransactionQuery(parse("")))).toBe("?sort=-trade_date&page=1&page_size=25");
  });
});

describe("countActiveFilters", () => {
  it("counts each filter group once and ignores sort/page", () => {
    expect(countActiveFilters(parse("sort=amount&page=2"))).toBe(0);
    expect(countActiveFilters(parse("type=BUY&type=SELL&status=PENDING&account_id=A00012"))).toBe(3);
  });
});
