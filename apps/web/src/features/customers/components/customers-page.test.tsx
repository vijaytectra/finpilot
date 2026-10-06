import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { jsonResponse, renderWithClient } from "@/test/render";

import type { CustomerPage } from "../types";
import { CustomersPage } from "./customers-page";

const navigation = vi.hoisted(() => ({
  search: "",
  push: vi.fn(),
  replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(navigation.search),
  usePathname: () => "/customers",
  useRouter: () => ({ push: navigation.push, replace: navigation.replace, prefetch: vi.fn() }),
}));

const page: CustomerPage = {
  items: [
    {
      customer_id: "C0089",
      full_name: "Aarav Bose",
      email: "aarav.bose89@example.test",
      city: "Jaipur",
      state: "RJ",
      kyc_status: "VERIFIED",
      segment: "Mass",
      accounts: 2,
      aum: 592127.96,
    },
    {
      customer_id: "C0010",
      full_name: "Aarav Rao",
      email: "aarav.rao10@example.test",
      city: "Ahmedabad",
      state: "GJ",
      kyc_status: "REVIEW",
      segment: "Mass",
      accounts: 1,
      aum: 453644.97,
    },
  ],
  pagination: { page: 1, page_size: 20, total: 2, pages: 1 },
};

describe("CustomersPage", () => {
  beforeEach(() => {
    navigation.search = "";
    navigation.push.mockReset();
    navigation.replace.mockReset();
  });

  it("sends URL filters to the API and renders the results", async () => {
    navigation.search = "search=aarav&kyc_status=VERIFIED&sort=-aum&page=2&bogus=1";
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(page));

    renderWithClient(<CustomersPage />);

    const table = await screen.findByRole("table");
    expect(within(table).getByRole("link", { name: "Aarav Bose" })).toHaveAttribute("href", "/customers/C0089");
    expect(within(table).getByText("₹5.92 L")).toBeInTheDocument();
    expect(within(table).getByText("KYC in review")).toBeInTheDocument();
    expect(screen.getByText(/2 matching customers/)).toBeInTheDocument();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/customers?search=aarav&kyc_status=VERIFIED&sort=-aum&page=2&page_size=20",
      expect.objectContaining({ method: "GET" }),
    );
    // The active AUM sort is exposed to assistive tech.
    expect(within(table).getByRole("columnheader", { name: /AUM/ })).toHaveAttribute("aria-sort", "descending");
  });

  it("shows a designed empty state with a clear-filters action", async () => {
    navigation.search = "search=zzz";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ items: [], pagination: { page: 1, page_size: 20, total: 0, pages: 0 } }),
    );

    renderWithClient(<CustomersPage />);

    expect(await screen.findByText("No customers match these filters")).toBeInTheDocument();
    screen.getAllByRole("button", { name: "Clear filters" })[0]?.click();
    expect(navigation.push).toHaveBeenCalledWith("/customers", { scroll: false });
  });

  it("shows the API error with a retry action and the request id", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({ error: { code: "INTERNAL_ERROR", message: "boom", request_id: "req-42" } }, 500),
    );

    renderWithClient(<CustomersPage />);

    expect(await screen.findByText("Something went wrong on our side")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(screen.getByText("req-42")).toBeInTheDocument();
  });
});
