import "server-only";
import { getLeaderboard } from "@/lib/leaderboard";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { CraneType } from "@/lib/crane-analysis-contract";

const bucket = "crane-submissions";

export type CraneReport = {
  id: string;
  craneType: Exclude<CraneType, "none">;
  score: number;
  scoreBreakdown: Record<string, number>;
  createdAt: string;
  imageUrl: string | null;
  rank: number | null;
  remainingSubmissions: number | null;
};

export async function getCraneReport(submissionId: string, playerId: string): Promise<CraneReport | null> {
  const admin = createAdminClient();
  const supabase = await createClient();
  const [submissionResult, countResult, leaderboard] = await Promise.all([
    admin
      .from("crane_submissions")
      .select("id, user_id, image_url, crane_type, score, score_breakdown, created_at")
      .eq("id", submissionId)
      .eq("user_id", playerId)
      .maybeSingle(),
    supabase.rpc("get_daily_submission_count"),
    getLeaderboard(),
  ]);

  if (submissionResult.error) {
    console.error("Failed to load a crane report:", submissionResult.error);
    throw new Error("Failed to load crane report.");
  }
  if (!submissionResult.data) return null;

  const submission = submissionResult.data;
  let imageUrl: string | null = null;
  try {
    const { data, error } = await admin.storage.from(bucket).createSignedUrl(submission.image_url, 900);
    if (error) console.error("Failed to sign a crane report image:", error);
    imageUrl = data?.signedUrl ?? null;
  } catch (error) {
    console.error("Failed to sign a crane report image:", error);
  }

  const rawBreakdown = submission.score_breakdown as Record<string, unknown> | null;
  const scoreBreakdown = Object.fromEntries(
    Object.entries(rawBreakdown ?? {}).filter((entry): entry is [string, number] =>
      typeof entry[1] === "number" && Number.isFinite(entry[1])),
  );
  const rank = leaderboard.status === "ready"
    ? leaderboard.entries.find((entry) => entry.isCurrentPlayer)?.rank ?? null
    : null;

  if (countResult.error) console.error("Failed to load the current daily submission count:", countResult.error);

  return {
    id: submission.id,
    craneType: submission.crane_type as Exclude<CraneType, "none">,
    score: Number(submission.score),
    scoreBreakdown,
    createdAt: submission.created_at,
    imageUrl,
    rank,
    remainingSubmissions: countResult.error
      ? null
      : Math.max(0, 3 - Number(countResult.data ?? 0)),
  };
}