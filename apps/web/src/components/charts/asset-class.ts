import type { components } from "@/lib/api/schema";

export type AssetClass = components["schemas"]["AssetClass"];

export const ASSET_CLASSES: readonly AssetClass[] = ["EQUITY", "ETF", "MUTUAL_FUND", "BOND", "REIT", "GSEC"];

/** Colour follows the entity, never its rank: the same asset class is the same colour everywhere. */
export const ASSET_CLASS_COLOR: Record<AssetClass, string> = {
  EQUITY: "var(--chart-1)",
  ETF: "var(--chart-2)",
  MUTUAL_FUND: "var(--chart-3)",
  BOND: "var(--chart-4)",
  REIT: "var(--chart-5)",
  GSEC: "var(--chart-6)",
};

export const ASSET_CLASS_LABEL: Record<AssetClass, string> = {
  EQUITY: "Equity",
  ETF: "ETF",
  MUTUAL_FUND: "Mutual fund",
  BOND: "Bond",
  REIT: "REIT",
  GSEC: "G-Sec",
};

export function assetClassLabel(value: string): string {
  return (ASSET_CLASS_LABEL as Record<string, string>)[value] ?? value;
}
