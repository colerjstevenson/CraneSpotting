import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type LeaderboardEntry = {
  rank: number;
  username: string | null;
  name: string;
  cranes: number;
  points: number;
  isCurrentPlayer: boolean;
};

type LeaderboardRow = {
  rank: number;
  username?: string | null;
  name: string;
  cranes: number;
  points: number;
  is_current_player: boolean;
};

type LeaderboardResult = {
  entries: LeaderboardEntry[];
  status: "ready" | "not-configured" | "error";
};

export async function getLeaderboard(): Promise<LeaderboardResult> {
  if (!isSupabaseConfigured()) {
    return { entries: [], status: "not-configured" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_global_leaderboard");

  if (error) {
    console.error("Failed to load the global leaderboard:", error);
    return { entries: [], status: "error" };
  }

  const rows = (data ?? []) as unknown as LeaderboardRow[];
  return {
    entries: rows.map((row) => ({
      rank: Number(row.rank),
      username: typeof row.username === "string" ? row.username : null,
      name: row.name,
      cranes: Number(row.cranes),
      points: Number(row.points),
      isCurrentPlayer: row.is_current_player,
    })),
    status: "ready",
  };
}