import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type CurrentPlayer = {
  id: string;
  displayName: string;
};

export async function getCurrentPlayer(): Promise<CurrentPlayer | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const playerId = data?.claims?.sub;

  if (error || typeof playerId !== "string") return null;

  const { data: profile } = await supabase
    .from("users")
    .select("display_name")
    .eq("id", playerId)
    .maybeSingle();

  return { id: playerId, displayName: profile?.display_name ?? "Crane spotter" };
}

export async function requirePlayer() {
  const player = await getCurrentPlayer();
  if (!player) redirect("/login?next=%2Fsubmit");
  return player;
}