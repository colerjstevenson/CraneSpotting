import assert from "node:assert/strict";
import test from "node:test";
import { calculateCraneScore, type CraneAnalysis } from "./crane-scoring";

function analysis(overrides: Partial<CraneAnalysis> = {}): CraneAnalysis {
  return {
    isCrane: true,
    craneType: "bird",
    confidence: 0.9,
    prominence: 0.9,
    fullCraneVisible: true,
    interestingComposition: true,
    craneCount: 1,
    captureContext: "live_scene",
    likelyStockOrReused: false,
    ...overrides,
  };
}

test("scores a real-world bird crane and its analysis bonuses", () => {
  const result = calculateCraneScore(analysis({ craneCount: 3 }));

  assert.equal(result.accepted, true);
  if (!result.accepted) return;
  assert.equal(result.score, 80);
  assert.equal(result.breakdown.additional_cranes_bonus, 10);
});

test("applies the reduced multiplier to a physical Master Crane poster", () => {
  const result = calculateCraneScore(analysis({
    craneType: "master_crane",
    captureContext: "physical_display",
    prominence: 0.2,
    fullCraneVisible: false,
    interestingComposition: false,
  }));

  assert.equal(result.accepted, true);
  if (!result.accepted) return;
  assert.equal(result.score, 55);
  assert.equal(result.breakdown.master_crane_bonus, 100);
  assert.equal(result.breakdown.authenticity_multiplier, 0.5);
});

test("rejects a Master Crane movie screenshot", () => {
  const result = calculateCraneScore(analysis({
    craneType: "master_crane",
    captureContext: "digital_reproduction",
  }));

  assert.deepEqual(result, {
    accepted: false,
    score: 0,
    breakdown: {},
    reason: "master_reproduction",
  });
});

test("reduces points for suspected stock or reused photography", () => {
  const result = calculateCraneScore(analysis({ likelyStockOrReused: true }));

  assert.equal(result.accepted, true);
  if (!result.accepted) return;
  assert.equal(result.score, 18);
  assert.equal(result.breakdown.authenticity_multiplier, 0.25);
});

test("accepts the confidence threshold and rejects values below it", () => {
  assert.equal(calculateCraneScore(analysis({ confidence: 0.7 })).accepted, true);
  assert.deepEqual(calculateCraneScore(analysis({ confidence: 0.699 })), {
    accepted: false,
    score: 0,
    breakdown: {},
    reason: "low_confidence",
  });
});

test("does not score an image classified as not a crane", () => {
  assert.equal(calculateCraneScore(analysis({ isCrane: false, craneType: "none" })).accepted, false);
});