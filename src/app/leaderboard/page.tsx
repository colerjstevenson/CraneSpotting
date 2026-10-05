import { ArrowRight, ListOrdered } from "lucide-react";
import Link from "next/link";
import { LeaderboardTable } from "@/components/leaderboard-table";
import { getLeaderboard } from "@/lib/leaderboard";

export const metadata = { title: "Leaderboard" };

export default async function LeaderboardPage() {
  const { entries, status } = await getLeaderboard();

  return (
    <>
      <section className="page-intro" aria-labelledby="leaderboard-title">
        <h1 className="page-title" id="leaderboard-title">Leader<br />Board</h1>
        <p className="page-description">Every spotter, ranked by all-time Crane Points.</p>
      </section>
      <section className="full-board" aria-label="Leaderboard standings">
        <div className="leaderboard-banner"><ListOrdered size={16} aria-hidden="true" /><span>CRANE RANKINGS</span><span>All-time crane points</span></div>
        <Link className="leaderboard-records-link" href="/top-cranes">See the all-time Top 5 Cranes <ArrowRight size={15} aria-hidden="true" /></Link>
        {status === "ready" && entries.length > 0 ? (
          <LeaderboardTable entries={entries} />
        ) : (
          <p className="leaderboard-message" role="status">
            {status === "not-configured"
              ? "Connect Supabase to load the leaderboard."
              : status === "error"
                ? "The standings couldn't load. Try again soon."
                : "No spotters yet. The first players will appear here."}
          </p>
        )}
      </section>
    </>
  );
}