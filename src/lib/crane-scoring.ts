import type { CaptureContext, CraneAnalysis } from "./crane-analysis-contract";

export type { CaptureContext, CraneAnalysis, CraneType } from "./crane-analysis-contract";

export type CraneScore =
  | {
      accepted: true;
      score: number;
      breakdown: Record<string, number>;
    }
  | {
      accepted: false;
      score: 0;
      breakdown: Record<string, number>;
      reason: "not_crane" | "low_confidence" | "master_reproduction" | "artwork_not_physical";
    };

export const minimumCraneConfidence = 0.7;

const authenticityMultipliers: Record<CaptureContext, number> = {
  live_scene: 1,
  physical_display: 0.5,
  digital_reproduction: 0.25,
  uncertain: 0.75,
};

export function calculateCraneScore(analysis: CraneAnalysis, maximumAuthenticityMultiplier = 1): CraneScore {
  if (!analysis.isCrane || analysis.craneType === "none") {
    return { accepted: false, score: 0, breakdown: {}, reason: "not_crane" };
  }
  if (analysis.confidence < minimumCraneConfidence) {
    return { accepted: false, score: 0, breakdown: {}, reason: "low_confidence" };
  }

  const isMasterCrane = analysis.craneType === "master_crane";
  const isArtwork = analysis.craneType === "artwork";
  const hasPhysicalContext = analysis.captureContext === "live_scene" || analysis.captureContext === "physical_display";
  if (isArtwork && !hasPhysicalContext) {
    return { accepted: false, score: 0, breakdown: {}, reason: "artwork_not_physical" };
  }
  if (isMasterCrane && (!hasPhysicalContext || analysis.likelyStockOrReused)) {
    return { accepted: false, score: 0, breakdown: {}, reason: "master_reproduction" };
  }

  const analysisMultiplier = analysis.likelyStockOrReused
    ? 0.25
    : authenticityMultipliers[analysis.captureContext];
  const authenticityMultiplier = Math.min(analysisMultiplier, maximumAuthenticityMultiplier);
  if (isArtwork) {
    return {
      accepted: true,
      score: Math.round(10 * authenticityMultiplier),
      breakdown: {
        crane_artwork_points: 10,
        authenticity_multiplier: authenticityMultiplier,
      },
    };
  }

  const craneTypeBonus = analysis.craneType === "bird" ? 30 : analysis.craneType === "construction" ? 10 : 0;
  const prominenceBonus = analysis.prominence >= 0.8 ? 10 : 0;
  const additionalCraneBonus = Math.max(0, analysis.craneCount - 1) * 5;
  const masterCraneBonus = isMasterCrane ? 100 : 0;
  const scoreBeforeAuthenticity = 10
    + craneTypeBonus
    + prominenceBonus
    + (analysis.fullCraneVisible ? 10 : 0)
    + (analysis.interestingComposition ? 10 : 0)
    + additionalCraneBonus
    + masterCraneBonus;

  return {
    accepted: true,
    score: Math.round(scoreBeforeAuthenticity * authenticityMultiplier),
    breakdown: {
      base_crane: 10,
      crane_type_bonus: craneTypeBonus,
      prominence_bonus: prominenceBonus,
      full_crane_visible_bonus: analysis.fullCraneVisible ? 10 : 0,
      interesting_composition_bonus: analysis.interestingComposition ? 10 : 0,
      additional_cranes_bonus: additionalCraneBonus,
      master_crane_bonus: masterCraneBonus,
      authenticity_multiplier: authenticityMultiplier,
    },
  };
}