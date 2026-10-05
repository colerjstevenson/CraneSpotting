import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { safeNextPath } from "@/lib/safe-next-path";
import { createClient } from "@/lib/supabase/server";

export type CurrentPlayer = {
  id: string;
  displayName: string;
  username: string | null;
};

export async function getCurrentPlayer(): Promise<CurrentPlayer | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const playerId = data?.claims?.sub;

  if (error || typeof playerId !== "string") return null;

  const { data: profile } = await supabase
    .from("users")
    .select("display_name, username")
    .eq("id", playerId)
    .maybeSingle();

  return {
    id: playerId,
    displayName: profile?.display_name ?? "Crane spotter",
    username: profile?.username ?? null,
  };
}

export async function requirePlayer(returnTo = "/submit") {
  const player = await getCurrentPlayer();
  if (!player) {
    const next = encodeURIComponent(safeNextPath(returnTo, "/submit"));
    redirect(`/login?next=${next}`);
  }
  return player;
}