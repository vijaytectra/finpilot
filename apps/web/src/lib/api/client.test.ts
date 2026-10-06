import { describe, expect, it, vi } from "vitest";

import { ApiError, apiFetch, buildQueryString } from "@/lib/api/client";

describe("buildQueryString", () => {
  it("drops empty values and repeats array keys", () => {
    expect(
      buildQueryString({
        search: "aarav",
        kyc_status: undefined,
        segment: null,
        empty: "",
        status: ["PENDING", "REVERSED"],
        page: 2,
      }),
    ).toBe("?search=aarav&status=PENDING&status=REVERSED&page=2");
  });

  it("returns an empty string when nothing is set", () => {
    expect(buildQueryString({ a: undefined })).toBe("");
    expect(buildQueryString(undefined)).toBe("");
  });
});

describe("apiFetch", () => {
  it("normalises the API error envelope into ApiError", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: "VALIDATION_ERROR",
            message: "Request validation failed",
            request_id: "req-123",
            details: [{ field: "target_amount", message: "must be greater than 0" }],
          },
        }),
        { status: 422, headers: { "Content-Type": "application/json" } },
      ),
    );

    const error = await apiFetch("/customers/C0001/goals", { method: "POST", body: {} }).catch(
      (e: unknown) => e,
    );

    expect(error).toBeInstanceOf(ApiError);
    const apiError = error as ApiError;
    expect(apiError.status).toBe(422);
    expect(apiError.code).toBe("VALIDATION_ERROR");
    expect(apiError.requestId).toBe("req-123");
    expect(apiError.details[0]?.field).toBe("target_amount");
  });

  it("tolerates non-JSON error bodies from a proxy", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("Bad gateway", { status: 502 }));
    const error = (await apiFetch("/reports/overview").catch((e: unknown) => e)) as ApiError;
    expect(error.status).toBe(502);
    expect(error.code).toBe("SERVER_ERROR");
  });

  it("calls the same-origin API path with the query string", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    await apiFetch("/customers", { query: { search: "rao", page: 1 } });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/customers?search=rao&page=1",
      expect.objectContaining({ method: "GET", credentials: "same-origin" }),
    );
  });
});
