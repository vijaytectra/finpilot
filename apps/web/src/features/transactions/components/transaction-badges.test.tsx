import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TransactionStatusBadge, transactionRowClass } from "./transaction-badges";

describe("TransactionStatusBadge", () => {
  it.each([
    ["SETTLED", "Settled"],
    ["PENDING", "Pending"],
    ["REVERSED", "Reversed"],
  ] as const)("renders %s as a text label with an icon, not colour alone", (status, label) => {
    const { container } = render(<TransactionStatusBadge status={status} />);
    const badge = screen.getByText(label);
    expect(badge).toBeInTheDocument();
    expect(badge.closest("[data-status]")).toHaveAttribute("data-status", status);
    // Decorative icon is present and hidden from assistive tech.
    expect(container.querySelector("svg[aria-hidden='true']")).not.toBeNull();
  });

  it("explains reversed trades on hover", () => {
    render(<TransactionStatusBadge status="REVERSED" />);
    expect(screen.getByText("Reversed").closest("[data-status]")).toHaveAttribute(
      "title",
      "Trade was reversed and has no effect on holdings",
    );
  });
});

describe("transactionRowClass", () => {
  it("strikes through reversed amounts and highlights pending rows", () => {
    expect(transactionRowClass("REVERSED")).toContain("line-through");
    expect(transactionRowClass("PENDING")).toContain("bg-warning-muted");
    expect(transactionRowClass("SETTLED")).toBe("");
  });
});
