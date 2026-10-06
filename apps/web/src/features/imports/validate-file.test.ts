import { describe, expect, it } from "vitest";

import { MAX_UPLOAD_BYTES } from "./types";
import { validateCsvFile } from "./validate-file";

describe("validateCsvFile", () => {
  it("accepts a non-empty .csv within the size limit", () => {
    expect(validateCsvFile({ name: "transactions.CSV", size: 304663 })).toBeNull();
    expect(validateCsvFile({ name: "t.csv", size: MAX_UPLOAD_BYTES })).toBeNull();
  });

  it("rejects other extensions, empty files and oversized files", () => {
    expect(validateCsvFile({ name: "transactions.xlsx", size: 10 })).toMatch(/Only \.csv/);
    expect(validateCsvFile({ name: "t.csv", size: 0 })).toMatch(/empty/);
    expect(validateCsvFile({ name: "t.csv", size: MAX_UPLOAD_BYTES + 1 })).toMatch(/limit is 25\.0 MB/);
  });
});
