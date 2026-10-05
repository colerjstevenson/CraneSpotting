import "server-only";
import { parseCraneAnalysis, type CraneAnalysis } from "./crane-analysis-contract";

const model = "@cf/cloudflare/clef";

type ClefQuestion =
  | { type: "noul"; instructions: string }
  | { type: "choice"; instructions: string; criteria: Record<string, string> }
  | { type: "score"; instructions: string; criteria: string[] };

export type CloudflareAiBinding = {
  run(modelName: string, input: {
    model: "clef";
    state: string;
    questions: Record<string, ClefQuestion>;
    images: string[];
  }): Promise<unknown>;
};

export class CraneAnalysisUnavailableError extends Error {
  constructor() {
    super("Crane analysis is unavailable.");
    this.name = "CraneAnalysisUnavailableError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function probability(value: unknown, field: string): number {
  if (!isRecord(value) || value.type !== "noul" || typeof value.noul !== "number" || !Number.isFinite(value.noul) || value.noul < 0 || value.noul > 1) {
    throw new Error(`Invalid Clef answer: ${field}`);
  }
  return value.noul;
}

function choice(value: unknown, field: string, options: string[]) {
  if (!isRecord(value) || value.type !== "choice" || typeof value.choice !== "string"
    || !options.includes(value.choice) || typeof value.confidence !== "number"
    || !Number.isFinite(value.confidence) || value.confidence < 0 || value.confidence > 1) {
    throw new Error(`Invalid Clef answer: ${field}`);
  }
  const selectedProbability = isRecord(value.probabilities) ? value.probabilities[value.choice] : value.confidence;
  if (typeof selectedProbability !== "number" || !Number.isFinite(selectedProbability)
    || selectedProbability < 0 || selectedProbability > 1) {
    throw new Error(`Invalid Clef probabilities: ${field}`);
  }
  return { value: value.choice, confidence: value.confidence, selectedProbability };
}

function score(value: unknown, field: string, maxValue: number): number {
  if (!isRecord(value) || value.type !== "score" || typeof value.score !== "number"
    || !Number.isFinite(value.score) || value.score < 0 || value.score > maxValue) {
    throw new Error(`Invalid Clef answer: ${field}`);
  }
  return value.score;
}

export function parseClefAnalysis(value: unknown): CraneAnalysis {
  if (!isRecord(value) || !isRecord(value.answers)) throw new Error("Clef returned an invalid response.");
  const answers = value.answers;
  const craneProbability = probability(answers.is_crane, "is_crane");
  const typeAnswer = choice(answers.crane_type, "crane_type", ["bird", "construction", "artwork", "master_crane", "none"]);
  const contextAnswer = choice(answers.capture_context, "capture_context", ["live_scene", "physical_display", "digital_reproduction", "uncertain"]);
  const countAnswer = choice(answers.crane_count, "crane_count", ["zero", "one", "two", "three_plus"]);
  const countByChoice = { zero: 0, one: 1, two: 2, three_plus: 3 } as const;
  const isCrane = craneProbability >= 0.5 && typeAnswer.value !== "none";
  const craneType = isCrane ? typeAnswer.value : "none";
  const context = contextAnswer.selectedProbability < 0.6 ? "uncertain" : contextAnswer.value;

  return parseCraneAnalysis({
    is_crane: isCrane,
    crane_type: craneType,
    confidence: Math.min(craneProbability, typeAnswer.confidence),
    prominence: score(answers.prominence, "prominence", 3) / 3,
    full_crane_visible: probability(answers.full_crane_visible, "full_crane_visible") >= 0.7,
    interesting_composition: probability(answers.interesting_composition, "interesting_composition") >= 0.7,
    crane_count: isCrane ? countByChoice[countAnswer.value as keyof typeof countByChoice] : 0,
    capture_context: context,
    likely_stock_or_reused: probability(answers.likely_stock_or_reused, "likely_stock_or_reused") >= 0.5,
  });
}

export async function analyzeCraneWithBinding(imageBytes: Uint8Array, ai: CloudflareAiBinding): Promise<CraneAnalysis> {
  try {
    const image = `data:image/jpeg;base64,${Buffer.from(imageBytes).toString("base64")}`;
    const result = await ai.run(model, {
      model: "clef",
      state: "Evaluate the attached real-world photo for Crane Spotting. Count real crane birds, working construction cranes, physical artwork depicting either kind of crane (including paintings, sculptures, and illuminated installations), or Master Crane. Artwork counts only when the physical work itself is photographed in its real setting; a screenshot, stock image, or digital reproduction does not count. A physical Master Crane depiction remains the special Master Crane type. Do not award points.",
      images: [image],
      questions: {
        is_crane: {
          type: "noul",
          instructions: "Does this image show an eligible crane for Crane Spotting? Real crane birds, working construction cranes, physical paintings/sculptures/installations depicting either kind, and physical depictions of Master Crane count. Count artwork only when the physical work is visible in its real setting, not from a screenshot, stock image, or digital reproduction.",
        },
        crane_type: {
          type: "choice",
          instructions: "Classify the eligible crane, or choose none if no eligible crane is shown.",
          criteria: {
            bird: "A real bird species that is a crane.",
            construction: "Real construction equipment used as a crane.",
            artwork: "A physical painting, sculpture, statue, illuminated installation, or other artwork depicting a crane bird or construction crane, photographed in the real world.",
            master_crane: "Master Crane from Kung Fu Panda, shown as a physical depiction in a real setting.",
            none: "No eligible crane, crane artwork, or Master Crane; includes unrelated birds and non-crane objects.",
          },
        },
        capture_context: {
          type: "choice",
          instructions: "Classify the visible capture context.",
          criteria: {
            live_scene: "A direct photo of a real crane bird or construction crane in its surroundings.",
            physical_display: "A physical painting, sculpture, poster, installation, toy, or depiction photographed in a real-world setting.",
            digital_reproduction: "A screenshot, movie frame, stock image, or photo of an existing digital picture.",
            uncertain: "The visible image does not establish the capture context.",
          },
        },
        likely_stock_or_reused: {
          type: "noul",
          instructions: "Is there strong visible evidence this is stock or reused photography?",
        },
        prominence: {
          type: "score",
          instructions: "How prominent is the eligible crane in the composition?",
          criteria: ["Barely visible or tiny", "Visible but secondary", "Prominent", "Dominates the frame"],
        },
        full_crane_visible: {
          type: "noul",
          instructions: "Is the full crane clearly visible in the photograph?",
        },
        interesting_composition: {
          type: "noul",
          instructions: "Does the photograph have an unusually interesting composition?",
        },
        crane_count: {
          type: "choice",
          instructions: "How many eligible cranes are visible?",
          criteria: { zero: "No eligible cranes", one: "One eligible crane", two: "Two eligible cranes", three_plus: "Three or more eligible cranes" },
        },
      },
    });

    return parseClefAnalysis(result);
  } catch (error) {
    console.error("Crane analysis failed:", error);
    throw new CraneAnalysisUnavailableError();
  }
}