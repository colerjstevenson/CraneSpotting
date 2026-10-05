import type { LeaderboardEntry } from "@/lib/leaderboard";
import Link from "next/link";

type LeaderboardTableProps = {
  entries: LeaderboardEntry[];
  compact?: boolean;
};

export function LeaderboardTable({ entries, compact = false }: LeaderboardTableProps) {
  return (
    <div className="leaderboard-wrap">
      <table className={`leaderboard-table${compact ? " leaderboard-table--compact" : ""}`}>
        <thead>
          <tr>
            <th scope="col">#</th><th scope="col">PLAYER</th><th scope="col">CRANES</th><th scope="col">POINTS</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr className={entry.isCurrentPlayer ? "current-player" : undefined} key={entry.rank}>
              <td className="rank-cell">{String(entry.rank).padStart(2, "0")}</td>
              <td className="player-cell">{entry.username
                ? <Link href={`/players/${entry.username}`}>{entry.name}</Link>
                : entry.name}{entry.isCurrentPlayer && <span className="player-label">YOU</span>}</td>
              <td>{entry.cranes}</td>
              <td className="points-cell">{entry.points.toLocaleString("en-US")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}