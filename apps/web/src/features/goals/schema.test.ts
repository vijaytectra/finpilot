import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/api/client";

import {
  emptyGoalValues,
  makeGoalSchema,
  mapGoalServerError,
  normalizeAmount,
  toCreatePayload,
  toUpdatePayload,
  type GoalFormValues,
} from "./schema";
import type { Goal } from "./types";

const TODAY = "2026-10-06";
const schema = makeGoalSchema({ today: TODAY });

const valid: GoalFormValues = {
  goal_name: "Retirement corpus",
  goal_type: "RETIREMENT",
  target_amount: "5000000",
  current_funded_amount: "1250000.5",
  target_date: "2040-03-31",
  priority: "HIGH",
};

function errorsFor(values: Partial<GoalFormValues>, s = schema) {
  const result = s.safeParse({ ...valid, ...values });
  if (result.success) return {};
  return Object.fromEntries(result.error.issues.map((i) => [String(i.path[0]), i.message]));
}

describe("normalizeAmount", () => {
  it("accepts grouped input and canonicalises to 2 decimals", () => {
    expect(normalizeAmount("12,50,000.5")).toBe("1250000.50");
    expect(normalizeAmount("₹ 100")).toBe("100.00");
    expect(normalizeAmount("007")).toBe("7.00");
  });

  it("rejects negatives, >2 decimals and non-numbers", () => {
    expect(normalizeAmount("-5")).toBeNull();
    expect(normalizeAmount("1.234")).toBeNull();
    expect(normalizeAmount("abc")).toBeNull();
    expect(normalizeAmount("1234567890123")).toBeNull(); // 13 integer digits > NUMERIC(14,2)
  });
});

describe("goal form schema", () => {
  it("accepts a valid goal", () => {
    expect(schema.safeParse(valid).success).toBe(true);
  });

  it("requires a name between 1 and 120 characters", () => {
    expect(errorsFor({ goal_name: "   " }).goal_name).toBe("Enter a goal name");
    expect(errorsFor({ goal_name: "x".repeat(121) }).goal_name).toMatch(/120 characters/);
  });

  it("requires a positive target with at most 2 decimals", () => {
    expect(errorsFor({ target_amount: "0" }).target_amount).toBe("Target amount must be greater than zero");
    expect(errorsFor({ target_amount: "10.555" }).target_amount).toMatch(/up to 2 decimals/);
    expect(errorsFor({ target_amount: "" }).target_amount).toBe("Enter the target amount");
  });

  it("rejects a funded amount above the target (compared exactly, not as floats)", () => {
    expect(errorsFor({ target_amount: "100.10", current_funded_amount: "100.11" }).current_funded_amount).toBe(
      "Funded amount cannot exceed the target amount",
    );
    expect(errorsFor({ target_amount: "100.10", current_funded_amount: "100.10" }).current_funded_amount).toBeUndefined();
  });

  it("requires a target date strictly in the future", () => {
    expect(errorsFor({ target_date: TODAY }).target_date).toBe("Target date must be in the future");
    expect(errorsFor({ target_date: "2026-10-07" }).target_date).toBeUndefined();
  });

  it("on edit, allows keeping an unchanged past date but not moving to another past date", () => {
    const editSchema = makeGoalSchema({ today: TODAY, originalTargetDate: "2025-01-01" });
    expect(errorsFor({ target_date: "2025-01-01" }, editSchema).target_date).toBeUndefined();
    expect(errorsFor({ target_date: "2025-06-01" }, editSchema).target_date).toBe("Target date must be in the future");
  });

  it("requires a goal type", () => {
    expect(errorsFor({ goal_type: emptyGoalValues().goal_type }).goal_type).toBe("Choose a goal type");
  });
});

describe("payloads", () => {
  const goal: Goal = {
    goal_id: "G00016",
    customer_id: "C0010",
    goal_type: "EMERGENCY_FUND",
    goal_name: "Primary Education",
    target_amount: 660196.79,
    current_funded_amount: 166081.32,
    remaining_amount: 494115.47,
    funded_pct: 25.16,
    target_date: "2028-12-26",
    priority: "HIGH",
    flags: ["NAME_TYPE_MISMATCH"],
    created_at: "2026-10-06T12:13:04Z",
    updated_at: "2026-10-06T12:13:04Z",
  };

  it("sends amounts as canonical decimal strings on create", () => {
    expect(toCreatePayload(valid)).toEqual({
      goal_name: "Retirement corpus",
      goal_type: "RETIREMENT",
      target_amount: "5000000.00",
      current_funded_amount: "1250000.50",
      target_date: "2040-03-31",
      priority: "HIGH",
    });
  });

  it("PATCHes only changed fields", () => {
    const values: GoalFormValues = {
      goal_name: "Primary Education",
      goal_type: "EDUCATION",
      target_amount: "660196.79",
      current_funded_amount: "2,00,000",
      target_date: "2028-12-26",
      priority: "HIGH",
    };
    expect(toUpdatePayload(goal, values)).toEqual({ goal_type: "EDUCATION", current_funded_amount: "200000.00" });
  });
});

describe("mapGoalServerError", () => {
  it("maps 422 details with a field onto that field", () => {
    const error = new ApiError({
      status: 422,
      code: "VALIDATION_ERROR",
      message: "Request validation failed",
      details: [{ field: "target_date", message: "target_date must be in the future" }],
    });
    expect(mapGoalServerError(error)).toEqual({
      fieldErrors: [{ field: "target_date", message: "Target date must be in the future" }],
      formError: null,
    });
  });

  it("attributes model-level errors to the first field named in the message", () => {
    const error = new ApiError({
      status: 422,
      code: "VALIDATION_ERROR",
      message: "Request validation failed",
      details: [{ field: "", message: "Value error, current_funded_amount cannot exceed target_amount" }],
    });
    expect(mapGoalServerError(error).fieldErrors).toEqual([
      { field: "current_funded_amount", message: "Funded amount cannot exceed target amount" },
    ]);
  });

  it("falls back to a form-level error for unknown fields and non-422 errors", () => {
    const unknown = new ApiError({
      status: 422,
      code: "VALIDATION_ERROR",
      message: "Request validation failed",
      details: [{ field: "", message: "at least one field must be provided" }],
    });
    expect(mapGoalServerError(unknown)).toEqual({ fieldErrors: [], formError: "At least one field must be provided" });

    const notFound = new ApiError({ status: 404, code: "GOAL_NOT_FOUND", message: "Goal G1 was not found" });
    expect(mapGoalServerError(notFound)).toEqual({ fieldErrors: [], formError: "Goal G1 was not found" });
  });
});
