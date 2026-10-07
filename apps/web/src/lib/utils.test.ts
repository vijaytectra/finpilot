import { describe, expect, it } from "vitest";

import { initials } from "./utils";

describe("initials", () => {
  it("takes the first letter of the first two words, upper-cased", () => {
    expect(initials("rohan kulkarni")).toBe("RK");
    expect(initials("Demo  Admin User")).toBe("DA");
    expect(initials("Aarav")).toBe("A");
    expect(initials("  ")).toBe("");
  });
});
