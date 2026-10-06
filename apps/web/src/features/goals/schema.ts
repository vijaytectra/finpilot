import { z } from "zod";

import { isApiError } from "@/lib/api/client";

import { GOAL_TYPES, PRIORITIES, type Goal, type GoalCreate, type GoalUpdate } from "./types";

/**
 * Client-side mirror of the API's goal rules (the server stays authoritative):
 * - name 1–120 chars (trimmed)
 * - target > 0, 0 ≤ funded ≤ target, at most 2 decimals, ≤ 12 integer digits (NUMERIC(14,2))
 * - target date strictly in the future (on edit: only if the date was changed)
 *
 * Amounts stay strings end to end and are compared as integer paise (BigInt), so no
 * floating-point arithmetic touches money.
 */

const AMOUNT_PATTERN = /^\d{1,12}(\.\d{1,2})?$/;

/** Accepts "12,50,000.5" style input; returns the canonical "1250000.50" or null if invalid. */
export function normalizeAmount(input: string): string | null {
  const cleaned = input.replace(/[,\s₹]/g, "");
  if (!AMOUNT_PATTERN.test(cleaned)) return null;
  const [whole = "0", fraction = ""] = cleaned.split(".");
  return `${BigInt(whole).toString()}.${fraction.padEnd(2, "0")}`;
}

export function toPaise(canonical: string): bigint {
  const [whole = "0", fraction = "00"] = canonical.split(".");
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0").slice(0, 2));
}

/** API number (already 2dp) → form string. */
export function amountToInput(value: number): string {
  return value.toFixed(2);
}

export const GOAL_FIELDS = [
  "goal_name",
  "goal_type",
  "target_amount",
  "current_funded_amount",
  "target_date",
  "priority",
] as const;
export type GoalField = (typeof GOAL_FIELDS)[number];

const amountField = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `Enter the ${label}`)
    .refine((v) => v === "" || normalizeAmount(v) !== null, {
      message: "Enter an amount in rupees with up to 2 decimals (e.g. 2500000 or 2500000.50)",
    });

export interface GoalSchemaOptions {
  /** Today's local date as YYYY-MM-DD (injected for testability). */
  today: string;
  /** On edit, the stored target date: keeping it unchanged is allowed even if it is now past. */
  originalTargetDate?: string;
}

export function makeGoalSchema({ today, originalTargetDate }: GoalSchemaOptions) {
  return z
    .object({
      goal_name: z
        .string()
        .trim()
        .min(1, "Enter a goal name")
        .max(120, "Keep the name to 120 characters or fewer"),
      goal_type: z.enum(GOAL_TYPES as [Goal["goal_type"], ...Goal["goal_type"][]], {
        error: "Choose a goal type",
      }),
      target_amount: amountField("target amount"),
      current_funded_amount: amountField("funded amount"),
      target_date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a target date")
        .refine((d) => !/^\d{4}-\d{2}-\d{2}$/.test(d) || d === originalTargetDate || d > today, { message: "Target date must be in the future" }),
      priority: z.enum(PRIORITIES as [Goal["priority"], ...Goal["priority"][]], { error: "Choose a priority" }),
    })
    .superRefine((values, ctx) => {
      const target = normalizeAmount(values.target_amount);
      const funded = normalizeAmount(values.current_funded_amount);
      if (target !== null && toPaise(target) <= 0n) {
        ctx.addIssue({ code: "custom", path: ["target_amount"], message: "Target amount must be greater than zero" });
      }
      if (target !== null && funded !== null && toPaise(funded) > toPaise(target)) {
        ctx.addIssue({
          code: "custom",
          path: ["current_funded_amount"],
          message: "Funded amount cannot exceed the target amount",
        });
      }
    });
}

export type GoalFormValues = z.input<ReturnType<typeof makeGoalSchema>>;

export function emptyGoalValues(): GoalFormValues {
  return {
    goal_name: "",
    goal_type: "" as GoalFormValues["goal_type"],
    target_amount: "",
    current_funded_amount: "0",
    target_date: "",
    priority: "MEDIUM",
  };
}

export function goalToFormValues(goal: Goal): GoalFormValues {
  return {
    goal_name: goal.goal_name,
    goal_type: goal.goal_type,
    target_amount: amountToInput(goal.target_amount),
    current_funded_amount: amountToInput(goal.current_funded_amount),
    target_date: goal.target_date,
    priority: goal.priority,
  };
}

export function toCreatePayload(values: GoalFormValues): GoalCreate {
  return {
    goal_name: values.goal_name.trim(),
    goal_type: values.goal_type,
    target_amount: normalizeAmount(values.target_amount) ?? values.target_amount,
    current_funded_amount: normalizeAmount(values.current_funded_amount) ?? values.current_funded_amount,
    target_date: values.target_date,
    priority: values.priority,
  };
}

/** Only the fields that actually changed, so PATCH stays a true partial update. */
export function toUpdatePayload(original: Goal, values: GoalFormValues): GoalUpdate {
  const patch: GoalUpdate = {};
  const name = values.goal_name.trim();
  if (name !== original.goal_name) patch.goal_name = name;
  if (values.goal_type !== original.goal_type) patch.goal_type = values.goal_type;
  const target = normalizeAmount(values.target_amount);
  if (target !== null && target !== amountToInput(original.target_amount)) patch.target_amount = target;
  const funded = normalizeAmount(values.current_funded_amount);
  if (funded !== null && funded !== amountToInput(original.current_funded_amount)) patch.current_funded_amount = funded;
  if (values.target_date !== original.target_date) patch.target_date = values.target_date;
  if (values.priority !== original.priority) patch.priority = values.priority;
  return patch;
}

export interface ServerErrorMapping {
  fieldErrors: { field: GoalField; message: string }[];
  formError: string | null;
}

/** The field named earliest in a message ("current_funded_amount cannot exceed target_amount" → funded). */
function firstMentionedField(message: string): GoalField | undefined {
  let best: { field: GoalField; index: number } | undefined;
  for (const field of GOAL_FIELDS) {
    const index = message.search(new RegExp(`\\b${field}\\b`));
    if (index >= 0 && (!best || index < best.index)) best = { field, index };
  }
  return best?.field;
}

export const GOAL_FIELD_LABELS: Record<GoalField, string> = {
  goal_name: "goal name",
  goal_type: "goal type",
  target_amount: "target amount",
  current_funded_amount: "funded amount",
  target_date: "target date",
  priority: "priority",
};

/** Strip pydantic prefixes and replace snake_case field names with their labels. */
function cleanMessage(message: string): string {
  let text = message.replace(/^Value error,\s*/i, "").trim();
  for (const field of GOAL_FIELDS) {
    text = text.replace(new RegExp(`\\b${field}\\b`, "g"), GOAL_FIELD_LABELS[field]);
  }
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Map an API 422 onto form fields. `details[].field` is used when it names a form field;
 * model-level errors (empty field) are attributed to a field named in the message, else
 * they become a form-level error. Non-422 errors are form-level.
 */
export function mapGoalServerError(error: unknown): ServerErrorMapping {
  if (!isApiError(error)) return { fieldErrors: [], formError: "Something went wrong. Please try again." };
  if (error.status !== 422 || error.details.length === 0) {
    return { fieldErrors: [], formError: error.message };
  }
  const fieldErrors: ServerErrorMapping["fieldErrors"] = [];
  const unmatched: string[] = [];
  for (const detail of error.details) {
    const message = cleanMessage(detail.message);
    const direct = GOAL_FIELDS.find((f) => f === detail.field);
    const mentioned = direct ?? firstMentionedField(detail.message);
    if (mentioned) fieldErrors.push({ field: mentioned, message });
    else unmatched.push(message);
  }
  return { fieldErrors, formError: unmatched.length ? unmatched.join(" ") : null };
}
