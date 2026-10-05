export type CraneType = "bird" | "construction" | "artwork" | "master_crane" | "none";
export type CaptureContext = "live_scene" | "physical_display" | "digital_reproduction" | "uncertain";

export type CraneAnalysis = {
  isCrane: boolean;
  craneType: CraneType;
  confidence: number;
  prominence: number;
  fullCraneVisible: boolean;
  interestingComposition: boolean;
  craneCount: number;
  captureContext: CaptureContext;
  likelyStockOrReused: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNumberBetweenZeroAndOne(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

export function parseCraneAnalysis(value: unknown): CraneAnalysis {
  if (!isRecord(value)) throw new Error("The crane analysis response was not an object.");

  const craneTypes: CraneType[] = ["bird", "construction", "artwork", "master_crane", "none"];
  const captureContexts: CaptureContext[] = ["live_scene", "physical_display", "digital_reproduction", "uncertain"];
  if (typeof value.is_crane !== "boolean"
    || typeof value.crane_type !== "string"
    || !craneTypes.includes(value.crane_type as CraneType)
    || !isNumberBetweenZeroAndOne(value.confidence)
    || !isNumberBetweenZeroAndOne(value.prominence)
    || typeof value.full_crane_visible !== "boolean"
    || typeof value.interesting_composition !== "boolean"
    || typeof value.crane_count !== "number"
    || !Number.isInteger(value.crane_count)
    || value.crane_count < 0
    || value.crane_count > 100
    || typeof value.capture_context !== "string"
    || !captureContexts.includes(value.capture_context as CaptureContext)
    || typeof value.likely_stock_or_reused !== "boolean") {
    throw new Error("The crane analysis response contained invalid fields.");
  }

  const craneType = value.crane_type as CraneType;
  if ((value.is_crane && (craneType === "none" || value.crane_count < 1))
    || (!value.is_crane && (craneType !== "none" || value.crane_count !== 0))) {
    throw new Error("The crane analysis response contained inconsistent classification fields.");
  }

  return {
    isCrane: value.is_crane,
    craneType,
    confidence: value.confidence,
    prominence: value.prominence,
    fullCraneVisible: value.full_crane_visible,
    interestingComposition: value.interesting_composition,
    craneCount: value.crane_count,
    captureContext: value.capture_context as CaptureContext,
    likelyStockOrReused: value.likely_stock_or_reused,
  };
}