import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AllocationBar } from "./allocation-bar";

const data = [
  { asset_class: "EQUITY" as const, market_value: 750, weight_pct: 75 },
  { asset_class: "BOND" as const, market_value: 250, weight_pct: 25 },
];

describe("AllocationBar", () => {
  it("summarises the split for assistive tech and lists each class with its weight", () => {
    render(<AllocationBar data={data} />);
    expect(screen.getByRole("img", { name: "Asset allocation: Equity 75.00%, Bond 25.00%" })).toBeInTheDocument();
    const legend = screen.getByRole("list", { name: "Allocation by asset class" });
    const items = within(legend).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("Equity");
    expect(items[0]).toHaveTextContent("75.00%");
  });

  it("sizes each segment by its weight", () => {
    const { container } = render(<AllocationBar data={data} />);
    const segments = container.querySelectorAll("[data-segment]");
    expect(segments).toHaveLength(2);
    expect((segments[0] as HTMLElement).style.width).toBe("75%");
  });
});
