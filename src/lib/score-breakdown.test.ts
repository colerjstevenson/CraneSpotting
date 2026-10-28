import assert from "node:assert/strict";
import test from "node:test";
import { formatBreakdownTitle, getScoreCalculation, parseScoreBreakdown } from "./score-breakdown";
import { calculateCraneScore, type CraneAnalysis } from "./crane-scoring";

test("reads only finite numeric values from a saved breakdown", () => {
  assert.deepEqual(parseScoreBreakdown({
    base_crane: 10,
    authenticity_multiplier: 0.75,
    prominence_bonus: 0,
    invalid: "10",
    missing: null,
    nested: { points: 10 },
    infinity: Infinity,
    nan: NaN,
  }), { base_crane: 10, authenticity_multiplier: 0.75, prominence_bonus: 0 });
});

test("missing and legacy breakdowns do not invent a calculation", () => {
  for (const value of [undefined, null, [], "{}", 10, {}]) {
    assert.deepEqual(parseScoreBreakdown(value), {});
    assert.equal(getScoreCalculation(parseScoreBreakdown(value)), null);
  }
  assert.equal(getScoreCalculation({ authenticity_multiplier: 0.75 }), null);
});

test("separates bonuses from the multiplier and retains zero-valued factors", () => {
  assert.deepEqual(getScoreCalculation({ base_crane: 10, crane_type_bonus: 30, prominence_bonus: 0, authenticity_multiplier: 0.75 }), {
    entries: [["base_crane", 10], ["crane_type_bonus", 30], ["prominence_bonus", 0]],
    subtotal: 40,
    multiplier: 0.75,
    adjusted: 30,
  });
});

test("does not assume an authenticity multiplier for older recorded factors", () => {
  const calculation = getScoreCalculation({ base_crane: 10 });
  assert.equal(calculation?.subtotal, 10);
  assert.equal(calculation?.multiplier, undefined);
  assert.equal(calculation?.adjusted, null);
});

test("matches stored scoring for bird, construction, artwork and Master Crane, including rounding", () => {
  const base: CraneAnalysis = {
    isCrane: true,
    craneType: "bird",
    confidence: 0.9,
    prominence: 0.9,
    fullCraneVisible: true,
    interestingComposition: true,
    craneCount: 1,
    captureContext: "live_scene",
    likelyStockOrReused: false,
  };
  for (const craneType of ["bird", "construction", "artwork", "master_crane"] as const) {
    for (const cap of [1, 0.75, 0.5, 0.25]) {
      const saved = calculateCraneScore({ ...base, craneType }, cap);
      assert.equal(saved.accepted, true);
      const calculation = getScoreCalculation(parseScoreBreakdown(saved.breakdown));
      assert.notEqual(calculation, null);
      assert.equal(Math.round(calculation!.adjusted!), saved.score);
    }
  }
  const rounded = getScoreCalculation({ base_crane: 10, crane_type_bonus: 30, prominence_bonus: 10, full_crane_visible_bonus: 10, interesting_composition_bonus: 10, authenticity_multiplier: 0.75 });
  assert.equal(rounded?.adjusted, 52.5);
  assert.equal(Math.round(rounded!.adjusted!), 53);
});

test("rejected submissions have no score calculation", () => {
  const saved = calculateCraneScore({
    isCrane: false, craneType: "none", confidence: 0.9, prominence: 0,
    fullCraneVisible: false, interestingComposition: false, craneCount: 0,
    captureContext: "live_scene", likelyStockOrReused: false,
  });
  assert.equal(saved.accepted, false);
  assert.equal(saved.score, 0);
  assert.equal(getScoreCalculation(saved.breakdown), null);
});

test("uses readable labels and preserves unknown legacy factors", () => {
  assert.equal(formatBreakdownTitle("crane_type_bonus", "bird"), "Bird crane");
  assert.equal(formatBreakdownTitle("crane_type_bonus", "construction"), "Construction crane");
  assert.equal(formatBreakdownTitle("crane_type_bonus", "master_crane"), "Crane type bonus");
  assert.equal(formatBreakdownTitle("master_crane_bonus", "master_crane"), "Master Crane bonus");
  assert.equal(formatBreakdownTitle("older_bonus", "artwork"), "older bonus");
});
