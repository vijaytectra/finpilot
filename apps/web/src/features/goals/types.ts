import type { components } from "@/lib/api/schema";

export type Goal = components["schemas"]["GoalOut"];
export type GoalList = components["schemas"]["GoalList"];
export type GoalSummary = components["schemas"]["GoalSummary"];
export type GoalType = components["schemas"]["GoalType"];
export type GoalFlag = components["schemas"]["GoalFlag"];
export type Priority = components["schemas"]["Band"];
export type GoalCreate = components["schemas"]["GoalCreate"];
export type GoalUpdate = components["schemas"]["GoalUpdate"];

export const GOAL_TYPES: readonly GoalType[] = [
  "RETIREMENT",
  "EDUCATION",
  "HOME_PURCHASE",
  "EMERGENCY_FUND",
  "WEALTH_CREATION",
  "TRAVEL",
];
export const PRIORITIES: readonly Priority[] = ["HIGH", "MEDIUM", "LOW"];
