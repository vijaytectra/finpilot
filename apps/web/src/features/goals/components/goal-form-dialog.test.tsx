import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { jsonResponse, renderWithClient } from "@/test/render";

import type { Goal } from "../types";
import { GoalFormDialog } from "./goal-form-dialog";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const goal: Goal = {
  goal_id: "G00015",
  customer_id: "C0010",
  goal_type: "TRAVEL",
  goal_name: "Personal Travel",
  target_amount: 9213046.88,
  current_funded_amount: 438501.18,
  remaining_amount: 8774545.7,
  funded_pct: 4.76,
  target_date: "2044-03-27",
  priority: "MEDIUM",
  flags: [],
  created_at: "2026-10-06T12:13:04Z",
  updated_at: "2026-10-06T12:13:04Z",
};

describe("GoalFormDialog (edit)", () => {
  it("PATCHes only the changed field and maps a server 422 onto that input", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Request validation failed",
            request_id: "req-7",
            details: [{ field: "", message: "Value error, current_funded_amount cannot exceed target_amount" }],
          },
        },
        422,
      ),
    );

    renderWithClient(<GoalFormDialog customerId="C0010" open onOpenChange={() => {}} goal={goal} />);

    const funded = screen.getByLabelText("Funded so far");
    await user.clear(funded);
    await user.type(funded, "500000");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/v1/goals/G00015");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body as string)).toEqual({ current_funded_amount: "500000.00" });

    expect(await screen.findByText("Funded amount cannot exceed target amount")).toBeInTheDocument();
    expect(screen.getByLabelText("Funded so far")).toHaveAttribute("aria-invalid", "true");
  });

  it("blocks client-side invalid input before calling the API", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(globalThis, "fetch");

    renderWithClient(<GoalFormDialog customerId="C0010" open onOpenChange={() => {}} goal={goal} />);

    const target = screen.getByLabelText("Target amount");
    await user.clear(target);
    await user.type(target, "100.555");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText(/up to 2 decimals/)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
