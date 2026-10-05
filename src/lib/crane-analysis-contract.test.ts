import assert from "node:assert/strict";
import test from "node:test";
import { calculateCraneScore } from "./crane-scoring";
import { parseCraneAnalysis } from "./crane-analysis-contract";
import { analyzeCraneWithBinding, CraneAnalysisUnavailableError, parseClefAnalysis } from "./crane-analysis-service";

const validResponse = {
  is_crane: true,
  crane_type: "bird",
  confidence: 0.94,
  prominence: 0.9,
  full_crane_visible: true,
  interesting_composition: false,
  crane_count: 1,
  capture_context: "live_scene",
  likely_stock_or_reused: false,
};

test("parses the structured provider response into the internal analysis contract", () => {
  assert.deepEqual(parseCraneAnalysis(validResponse), {
    isCrane: true,
    craneType: "bird",
    confidence: 0.94,
    prominence: 0.9,
    fullCraneVisible: true,
    interestingComposition: false,
    craneCount: 1,
    captureContext: "live_scene",
    likelyStockOrReused: false,
  });
});

test("rejects inconsistent crane classification fields", () => {
  assert.throws(() => parseCraneAnalysis({ ...validResponse, crane_type: "none" }), /inconsistent/);
});

test("rejects out-of-range confidence and unknown capture context", () => {
  assert.throws(() => parseCraneAnalysis({ ...validResponse, confidence: 1.1 }), /invalid fields/);
  assert.throws(() => parseCraneAnalysis({ ...validResponse, capture_context: "maybe_stock" }), /invalid fields/);
});

test("sends image bytes to the Cloudflare vision model and validates its response", async () => {
  let requestedModel = "";
  let imageData = "";
  const result = await analyzeCraneWithBinding(new Uint8Array([0xff, 0xd8, 0xff]), {
    async run(model, input) {
      requestedModel = model;
      imageData = input.images[0];
      return clefResponse;
    },
  });

  assert.equal(requestedModel, "@cf/cloudflare/clef");
  assert.equal(imageData, "data:image/jpeg;base64,/9j/");
  assert.deepEqual(result, {
    isCrane: true,
    craneType: "bird",
    confidence: 0.91,
    prominence: 0.9,
    fullCraneVisible: true,
    interestingComposition: false,
    craneCount: 1,
    captureContext: "live_scene",
    likelyStockOrReused: false,
  });
});

test("maps Clef's non-crane answer to a rejected analysis", () => {
  const result = parseClefAnalysis({
    answers: {
      ...clefResponse.answers,
      is_crane: { type: "noul", noul: 0.1969 },
      crane_type: { type: "choice", choice: "none", confidence: 0.7737 },
      capture_context: { type: "choice", choice: "physical_display", confidence: 0.5317 },
      crane_count: { type: "choice", choice: "zero", confidence: 0.8039 },
    },
  });

  assert.deepEqual(result, {
    isCrane: false,
    craneType: "none",
    confidence: 0.1969,
    prominence: 0.9,
    fullCraneVisible: true,
    interestingComposition: false,
    craneCount: 0,
    captureContext: "uncertain",
    likelyStockOrReused: false,
  });
});

test("maps physical crane artwork to its reduced artwork score", () => {
  const analysis = parseClefAnalysis({
    answers: {
      ...clefResponse.answers,
      is_crane: { type: "noul", noul: 0.91 },
      crane_type: { type: "choice", choice: "artwork", confidence: 0.84, probabilities: { artwork: 0.91 } },
      capture_context: { type: "choice", choice: "physical_display", confidence: 0.53, probabilities: { physical_display: 0.79 } },
      crane_count: { type: "choice", choice: "two", confidence: 0.82, probabilities: { two: 0.82 } },
    },
  });
  const result = calculateCraneScore(analysis);

  assert.equal(analysis.craneType, "artwork");
  assert.equal(analysis.captureContext, "physical_display");
  assert.equal(result.accepted, true);
  if (!result.accepted) return;
  assert.equal(result.score, 5);
  assert.equal(result.breakdown.crane_artwork_points, 10);
});

test("maps Cloudflare AI failures to a safe analysis error", async () => {
  await assert.rejects(
    analyzeCraneWithBinding(new Uint8Array([0xff, 0xd8, 0xff]), {
      async run() {
        throw new Error("model unavailable");
      },
    }),
    CraneAnalysisUnavailableError,
  );
});

const clefResponse = {
  answers: {
    is_crane: { type: "noul", noul: 0.94 },
    crane_type: { type: "choice", choice: "bird", confidence: 0.91 },
    capture_context: { type: "choice", choice: "live_scene", confidence: 0.9 },
    likely_stock_or_reused: { type: "noul", noul: 0.1123 },
    prominence: { type: "score", score: 2.7 },
    full_crane_visible: { type: "noul", noul: 0.91 },
    interesting_composition: { type: "noul", noul: 0.2224 },
    crane_count: { type: "choice", choice: "one", confidence: 0.85 },
  },
};