import "server-only";
import { getLeaderboard } from "@/lib/leaderboard";
import type { CraneType } from "@/lib/crane-analysis-contract";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createAdminClient } from "@/lib/supabase/admin";

const bucket = "crane-submissions";
const pageSize = 12;

type SubmissionRow = {
  id: string;
  image_url: string | null;
  image_hidden: boolean;
  crane_type?: Exclude<CraneType, "none">;
  rejection_reason?: string;
  score: number | string;
  created_at: string;
};

export type PlayerProfileSubmission = {
  id: string;
  craneType: CraneType;
  rejectionReason: string | null;
  score: number;
  createdAt: string;
  imageHidden: boolean;
  imageUrl: string | null;
};

export type PlayerGalleryTab = "cranes" | "not-cranes";

export type PlayerProfile = {
  id: string;
  username: string;
  displayName: string;
  rank: number;
  points: number;
  cranes: number;
  bestCrane: { craneType: Exclude<CraneType, "none">; score: number } | null;
  submissions: PlayerProfileSubmission[];
  galleryTab: PlayerGalleryTab;
  galleryCount: number;
  page: number;
  pageCount: number;
};

export type PlayerProfileResult =
  | { status: "ready"; profile: PlayerProfile }
  | { status: "not-configured" | "error" | "not-found" };

export async function getPlayerProfile(username: string, page: number, galleryTab: PlayerGalleryTab = "cranes"): Promise<PlayerProfileResult> {
  if (!isSupabaseConfigured()) return { status: "not-configured" };

  try {
    const admin = createAdminClient();
    const { data: player, error: playerError } = await admin
      .from("users")
      .select("id, username, display_name")
      .eq("username", username)
      .maybeSingle();

    if (playerError) {
      console.error("Failed to load a player profile:", playerError);
      return { status: "error" };
    }
    if (!player) return { status: "not-found" };

    const leaderboard = await getLeaderboard();
    if (leaderboard.status !== "ready") return { status: "error" };
    const standing = leaderboard.entries.find((entry) => entry.username === username);
    if (!standing) return { status: "error" };

    const offset = (page - 1) * pageSize;
    const galleryQuery = galleryTab === "not-cranes"
      ? admin.from("crane_submission_attempts")
        .select("id, image_url, image_hidden, rejection_reason, created_at", { count: "exact" })
        .eq("outcome", "rejected")
      : admin.from("crane_submissions")
        .select("id, image_url, image_hidden, crane_type, score, created_at", { count: "exact" });
    const [bestResult, submissionsResult] = await Promise.all([
      admin
        .from("crane_submissions")
        .select("crane_type, score")
        .eq("user_id", player.id)
        .order("score", { ascending: false })
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle(),
      galleryQuery
        .eq("user_id", player.id)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(offset, offset + pageSize - 1),
    ]);

    if (bestResult.error || submissionsResult.error) {
      console.error("Failed to load player crane submissions:", bestResult.error ?? submissionsResult.error);
      return { status: "error" };
    }

    const rows = (submissionsResult.data ?? []) as SubmissionRow[];
    const submissions = await Promise.all(rows.map(async (row): Promise<PlayerProfileSubmission> => {
      let imageUrl: string | null = null;
      if (!row.image_hidden && row.image_url) {
        try {
          const { data, error } = await admin.storage.from(bucket).createSignedUrl(row.image_url, 900);
          if (error) console.error("Failed to sign a profile gallery image:", error);
          imageUrl = data?.signedUrl ?? null;
        } catch (error) {
          console.error("Failed to sign a profile gallery image:", error);
        }
      }

      return {
        id: row.id,
        craneType: row.crane_type ?? "none",
        rejectionReason: row.rejection_reason ?? null,
        score: Number(row.score ?? 0),
        createdAt: row.created_at,
        imageHidden: row.image_hidden,
        imageUrl,
      };
    }));

    const galleryCount = submissionsResult.count ?? 0;
    const pageCount = Math.max(1, Math.ceil(galleryCount / pageSize));
    return {
      status: "ready",
      profile: {
        id: player.id,
        username: player.username,
        displayName: player.display_name,
        rank: standing.rank,
        points: standing.points,
        cranes: standing.cranes,
        bestCrane: bestResult.data
          ? {
              craneType: bestResult.data.crane_type as Exclude<CraneType, "none">,
              score: Number(bestResult.data.score),
            }
          : null,
        submissions,
        galleryTab,
        galleryCount,
        page,
        pageCount,
      },
    };
  } catch (error) {
    console.error("Failed to load a player profile:", error);
    return { status: "error" };
  }
}