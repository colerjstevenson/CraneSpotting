import "server-only";
import { env } from "cloudflare:workers";
import { analyzeCraneWithBinding } from "./crane-analysis-service";

export { CraneAnalysisUnavailableError } from "./crane-analysis-service";
export { parseCraneAnalysis } from "./crane-analysis-contract";
export type { CraneAnalysis } from "./crane-analysis-contract";

export function analyzeCrane(imageBytes: Uint8Array) {
  return analyzeCraneWithBinding(imageBytes, env.AI);
}