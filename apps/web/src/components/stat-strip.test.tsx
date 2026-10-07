import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StatStrip } from "./stat-strip";

describe("StatStrip", () => {
  it("renders each figure as a labelled term/definition pair", () => {
    render(
      <StatStrip
        label="Book size"
        items={[
          { label: "Customers", value: "120", hint: "113 with holdings" },
          { label: "Accounts", value: "167", title: "167 accounts" },
        ]}
      />,
    );
    const list = screen.getByRole("region", { name: "Book size" });
    expect(list).toHaveTextContent("Customers");
    expect(screen.getByText("120")).toBeInTheDocument();
    expect(screen.getByText("113 with holdings")).toBeInTheDocument();
    expect(screen.getByText("167")).toHaveAttribute("title", "167 accounts");
  });
});
