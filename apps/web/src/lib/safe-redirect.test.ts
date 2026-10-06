import { describe, expect, it } from "vitest";

import { safeNextPath } from "@/lib/safe-redirect";

const ORIGIN = "https://finpilot.example";
const check = (next: string | null) => safeNextPath(next, ORIGIN);

describe("safeNextPath", () => {
  it("keeps same-origin paths with query and hash", () => {
    expect(check("/customers/C0010")).toBe("/customers/C0010");
    expect(check("/customers?search=aarav&page=2#top")).toBe("/customers?search=aarav&page=2#top");
  });

  it("rejects protocol-relative and absolute URLs", () => {
    expect(check("//evil.com")).toBe("/");
    expect(check("https://evil.com")).toBe("/");
    expect(check("javascript:alert(1)")).toBe("/");
  });

  it("rejects backslash tricks that URL parsing turns into //host", () => {
    expect(check("/\\evil.com")).toBe("/");
    expect(check("/\\/evil.com")).toBe("/");
  });

  it("rejects control characters and whitespace", () => {
    expect(check("/\t/evil.com")).toBe("/");
    expect(check("/\n/evil.com")).toBe("/");
    expect(check("/ /evil.com")).toBe("/");
  });

  it("treats an encoded backslash as a plain on-origin path", () => {
    expect(check("/%5Cevil.com")).toBe("/%5Cevil.com");
  });

  it("never redirects back to the login page", () => {
    expect(check("/login?next=/x")).toBe("/");
    expect(check("/login")).toBe("/");
  });

  it("falls back to / for empty input", () => {
    expect(check(null)).toBe("/");
    expect(check("")).toBe("/");
  });
});
