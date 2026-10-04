import { ArrowUpRight, ListOrdered } from "lucide-react";
import { LeaderboardTable } from "@/components/leaderboard-table";
import { demoLeaderboard } from "@/lib/demo-data";

export const metadata = { title: "Global leaderboard" };

export default function LeaderboardPage() {
  return (
    <>
      <section className="page-intro" aria-labelledby="leaderboard-title">
        <p className="page-kicker">HIGH SCORES / DEMO ROUND</p>
        <h1 className="page-title" id="leaderboard-title">The high<br />scores!</h1>
        <p className="page-description">Sample standings only. No player accounts or live scoring yet.</p>
      </section>
      <section className="full-board" aria-label="Sample leaderboard standings">
        <div className="demo-banner"><ListOrdered size={16} aria-hidden="true" /><span>DEMO SCORES</span><span>Not connected to player accounts</span><ArrowUpRight size={15} aria-hidden="true" /></div>
        <LeaderboardTable entries={demoLeaderboard} />
      </section>
    </>
  );
}