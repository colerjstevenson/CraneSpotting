"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useState } from "react";
import type { LeaderboardEntry } from "@/lib/leaderboard";
import {
  getAveragePoints,
  getNextLeaderboardSort,
  sortLeaderboardEntries,
  type LeaderboardSort,
  type LeaderboardSortKey,
} from "@/lib/leaderboard-table";
import Link from "next/link";

type LeaderboardTableProps = {
  entries: LeaderboardEntry[];
  compact?: boolean;
};

const columns: { key: LeaderboardSortKey; label: string; accessibleLabel: string }[] = [
  { key: "rank", label: "#", accessibleLabel: "Rank" },
  { key: "name", label: "PLAYER", accessibleLabel: "Player" },
  { key: "cranes", label: "CRANES", accessibleLabel: "Cranes" },
  { key: "points", label: "POINTS", accessibleLabel: "Points" },
  { key: "average", label: "AVG / CRANE", accessibleLabel: "Average points per crane" },
];

export function LeaderboardTable({ entries, compact = false }: LeaderboardTableProps) {
  const [sort, setSort] = useState<LeaderboardSort>({ key: "points", direction: "descending" });
  const sortedEntries = sortLeaderboardEntries(entries, sort);

  return (
    <div className="leaderboard-wrap">
      <table className={`leaderboard-table${compact ? " leaderboard-table--compact" : ""}`}>
        <thead>
          <tr>
            {columns.map(({ key, label, accessibleLabel }) => {
              const active = sort.key === key;
              const SortIcon = active ? sort.direction === "ascending" ? ArrowUp : ArrowDown : ArrowUpDown;
              const nextSort = getNextLeaderboardSort(sort, key);
              return (
                <th scope="col" key={key} aria-sort={active ? sort.direction : undefined}>
                  <button
                    className="leaderboard-sort"
                    type="button"
                    aria-label={`${accessibleLabel}: sort ${nextSort.direction}`}
                    onClick={() => setSort((current) => getNextLeaderboardSort(current, key))}
                  >
                    <span>{label}</span>
                    <SortIcon size={12} aria-hidden="true" />
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sortedEntries.map((entry) => (
            <tr className={entry.isCurrentPlayer ? "current-player" : undefined} key={entry.rank}>
              <td className="rank-cell">{String(entry.rank).padStart(2, "0")}</td>
              <td className="player-cell">{entry.username
                ? <Link href={`/players/${entry.username}`}>{entry.name}</Link>
                : entry.name}{entry.isCurrentPlayer && <span className="player-label">YOU</span>}</td>
              <td>{entry.cranes}</td>
              <td className="points-cell">{entry.points.toLocaleString("en-US")}</td>
              <td className="average-cell">{getAveragePoints(entry)?.toLocaleString("en-US", {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              }) ?? <span aria-label="No cranes">{"\u2014"}</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}