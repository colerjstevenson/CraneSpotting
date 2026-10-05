import "server-only";
import type { CraneType } from "@/lib/crane-analysis-contract";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createAdminClient } from "@/lib/supabase/admin";

const bucket = "crane-submissions";

type SubmissionRow = {
  id: string;
  user_id: string;
  image_url: string;
  image_hidden: boolean;
  crane_type: Exclude<CraneType, "none">;
  score: number | string;
  created_at: string;
};

type PlayerRow = {
  id: string;
  username: string | null;
  display_name: string;
};

export type TopCrane = {
  id: string;
  username: string | null;
  playerName: string;
  craneType: Exclude<CraneType, "none">;
  score: number;
  createdAt: string;
  imageUrl: string | null;
};

export type TopCraneResult =
  | { status: "ready"; cranes: TopCrane[] }
  | { status: "not-configured" | "error"; cranes: [] };

export async function getTopCranes(): Promise<TopCraneResult> {
  if (!isSupabaseConfigured()) return { status: "not-configured", cranes: [] };

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("crane_submissions")
      .select("id, user_id, image_url, image_hidden, crane_type, score, created_at")
      .order("score", { ascending: false })
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(5);

    if (error) {
      console.error("Failed to load the all-time top cranes:", error);
      return { status: "error", cranes: [] };
    }

    const submissions = (data ?? []) as SubmissionRow[];
    if (submissions.length === 0) return { status: "ready", cranes: [] };

    const userIds = [...new Set(submissions.map((submission) => submission.user_id))];
    const { data: playersData, error: playersError } = await admin
      .from("users")
      .select("id, username, display_name")
      .in("id", userIds);

    if (playersError) {
      console.error("Failed to load top crane players:", playersError);
      return { status: "error", cranes: [] };
    }

    const players = new Map(((playersData ?? []) as PlayerRow[]).map((player) => [player.id, player]));
    const cranes = await Promise.all(submissions.map(async (submission): Promise<TopCrane> => {
      const player = players.get(submission.user_id);
      let imageUrl: string | null = null;

      if (!submission.image_hidden) {
        try {
          const { data: imageData, error: imageError } = await admin.storage
            .from(bucket)
            .createSignedUrl(submission.image_url, 900);
          if (imageError) console.error("Failed to sign a top crane image:", imageError);
          imageUrl = imageData?.signedUrl ?? null;
        } catch (error) {
          console.error("Failed to sign a top crane image:", error);
        }
      }

      return {
        id: submission.id,
        username: player?.username ?? null,
        playerName: player?.display_name ?? "Crane Spotter",
        craneType: submission.crane_type,
        score: Number(submission.score),
        createdAt: submission.created_at,
        imageUrl,
      };
    }));

    return { status: "ready", cranes };
  } catch (error) {
    console.error("Failed to load the all-time top cranes:", error);
    return { status: "error", cranes: [] };
  }
}