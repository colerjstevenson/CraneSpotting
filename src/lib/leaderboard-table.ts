import type { LeaderboardEntry } from "./leaderboard";

export type LeaderboardSortKey = "rank" | "name" | "cranes" | "points" | "average";
export type LeaderboardSort = {
  key: LeaderboardSortKey;
  direction: "ascending" | "descending";
};

export function getAveragePoints(entry: LeaderboardEntry): number | null {
  return entry.cranes === 0 ? null : entry.points / entry.cranes;
}

export function getNextLeaderboardSort(
  current: LeaderboardSort,
  key: LeaderboardSortKey,
): LeaderboardSort {
  return {
    key,
    direction: current.key === key
      ? current.direction === "ascending" ? "descending" : "ascending"
      : key === "rank" || key === "name" ? "ascending" : "descending",
  };
}

export function sortLeaderboardEntries(
  entries: readonly LeaderboardEntry[],
  { key, direction }: LeaderboardSort,
): LeaderboardEntry[] {
  return [...entries].sort((a, b) => {
    let comparison: number;
    if (key === "name") {
      comparison = a.name.localeCompare(b.name, "en", { sensitivity: "base" });
    } else {
      const left = key === "average" ? getAveragePoints(a) : a[key];
      const right = key === "average" ? getAveragePoints(b) : b[key];
      if (left === null || right === null) {
        return left === right ? a.rank - b.rank : left === null ? 1 : -1;
      }
      comparison = left - right;
    }
    return (direction === "ascending" ? comparison : -comparison) || a.rank - b.rank;
  });
}
