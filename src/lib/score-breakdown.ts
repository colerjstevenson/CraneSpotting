import type { CraneType } from "./crane-analysis-contract";

const breakdownTitles: Record<string, string> = {
  base_crane: "Base crane",
  prominence_bonus: "Large / prominent",
  full_crane_visible_bonus: "Full crane visible",
  interesting_composition_bonus: "Interesting composition",
  additional_cranes_bonus: "Additional cranes",
  master_crane_bonus: "Master Crane bonus",
  crane_artwork_points: "Crane artwork",
};

export function parseScoreBreakdown(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, number] =>
      typeof entry[1] === "number" && Number.isFinite(entry[1])),
  );
}

export function formatBreakdownTitle(key: string, craneType: CraneType) {
  if (key === "crane_type_bonus") {
    return craneType === "bird" ? "Bird crane" : craneType === "construction" ? "Construction crane" : "Crane type bonus";
  }
  return breakdownTitles[key] ?? key.replaceAll("_", " ");
}

export function getScoreCalculation(breakdown: Record<string, number>) {
  const entries = Object.entries(breakdown).filter(([key]) => key !== "authenticity_multiplier");
  if (entries.length === 0) return null;
  const subtotal = entries.reduce((sum, [, value]) => sum + value, 0);
  const multiplier = breakdown.authenticity_multiplier;
  return {
    entries,
    subtotal,
    multiplier,
    adjusted: typeof multiplier === "number" ? subtotal * multiplier : null,
  };
}
