import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { InstrumentHolders, TopCustomer } from "../types";
import { TopCustomersCard } from "./top-customers-card";
import { TopInstrumentsCard } from "./top-instruments-card";

const customers: TopCustomer[] = Array.from({ length: 10 }, (_, i) => ({
  customer_id: `C${String(i + 1).padStart(4, "0")}`,
  full_name: `Customer ${i + 1}`,
  segment: "Mass",
  aum: 1_000_000 - i * 10_000,
}));

const instruments: InstrumentHolders[] = Array.from({ length: 10 }, (_, i) => ({
  instrument_id: `I${String(i + 1).padStart(4, "0")}`,
  symbol: `EQ${String(i + 1).padStart(3, "0")}`,
  instrument_name: `Instrument ${i + 1}`,
  asset_class: "EQUITY",
  holders: 30 - i,
}));

describe("overview top lists", () => {
  it("shows only the top 5 customers by AUM, in rank order", () => {
    render(<TopCustomersCard customers={customers} />);
    const rows = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(rows).toHaveLength(5);
    expect(rows[0]).toHaveTextContent("Customer 1");
    expect(rows[4]).toHaveTextContent("Customer 5");
    expect(screen.queryByText("Customer 6")).not.toBeInTheDocument();
  });

  it("shows only the 5 most widely held instruments", () => {
    render(<TopInstrumentsCard instruments={instruments} />);
    // 1 header row + 5 body rows.
    const rows = screen.getAllByRole("row");
    expect(rows).toHaveLength(6);
    expect(screen.getByText("EQ005")).toBeInTheDocument();
    expect(screen.queryByText("EQ006")).not.toBeInTheDocument();
  });
});
