import assert from "node:assert/strict";
import test from "node:test";
import type { LeaderboardEntry } from "./leaderboard";
import {
  getAveragePoints,
  getNextLeaderboardSort,
  sortLeaderboardEntries,
  type LeaderboardSortKey,
} from "./leaderboard-table";

const entries: LeaderboardEntry[] = [
  { rank: 1, username: "zulu", name: "Zulu", cranes: 4, points: 100, isCurrentPlayer: false },
  { rank: 2, username: "alpha", name: "Alpha", cranes: 2, points: 90, isCurrentPlayer: true },
  { rank: 3, username: "bravo", name: "Bravo", cranes: 5, points: 80, isCurrentPlayer: false },
  { rank: 4, username: null, name: "New player", cranes: 0, points: 0, isCurrentPlayer: false },
];

test("calculates averages without rounding and leaves zero-crane averages missing", () => {
  assert.equal(getAveragePoints(entries[0]), 25);
  assert.equal(getAveragePoints({ ...entries[0], cranes: 3 }), 100 / 3);
  assert.equal(getAveragePoints(entries[3]), null);
});

const expected: Record<LeaderboardSortKey, [number[], number[]]> = {
  rank: [[1, 2, 3, 4], [4, 3, 2, 1]],
  name: [[2, 3, 4, 1], [1, 4, 3, 2]],
  cranes: [[4, 2, 1, 3], [3, 1, 2, 4]],
  points: [[4, 3, 2, 1], [1, 2, 3, 4]],
  average: [[3, 1, 2, 4], [2, 1, 3, 4]],
};

for (const key of Object.keys(expected) as LeaderboardSortKey[]) {
  test(`sorts ${key} in both directions without changing official ranks`, () => {
    for (const [index, direction] of (["ascending", "descending"] as const).entries()) {
      assert.deepEqual(
        sortLeaderboardEntries(entries, { key, direction }).map((entry) => entry.rank),
        expected[key][index],
      );
    }
  });
}

test("breaks ties by official rank in both directions, including missing averages", () => {
  const tied = [3, 1, 2].map((rank) => ({ ...entries[0], rank, name: rank === 2 ? "zulu" : "Zulu" }));
  for (const key of Object.keys(expected) as LeaderboardSortKey[]) {
    if (key === "rank") continue;
    for (const direction of ["ascending", "descending"] as const) {
      assert.deepEqual(sortLeaderboardEntries(tied, { key, direction }).map((entry) => entry.rank), [1, 2, 3]);
      assert.deepEqual(
        sortLeaderboardEntries(tied.map((entry) => ({ ...entry, cranes: 0 })), { key: "average", direction })
          .map((entry) => entry.rank),
        [1, 2, 3],
      );
    }
  }
});

test("sorts unrounded averages and distinguishes a zero score from no cranes", () => {
  const close = [
    { ...entries[0], rank: 1, points: 1001, cranes: 100 },
    { ...entries[0], rank: 2, points: 1002, cranes: 100 },
    { ...entries[0], rank: 3, points: 0, cranes: 1 },
    { ...entries[3] },
  ];
  assert.deepEqual(
    sortLeaderboardEntries(close, { key: "average", direction: "descending" }).map((entry) => entry.rank),
    [2, 1, 3, 4],
  );
  assert.deepEqual(
    sortLeaderboardEntries(close, { key: "average", direction: "ascending" }).map((entry) => entry.rank),
    [3, 1, 2, 4],
  );
});

test("returns a new array without mutating entries or losing player metadata", () => {
  const frozen = Object.freeze(entries.map((entry) => Object.freeze({ ...entry })));
  const sorted = sortLeaderboardEntries(frozen, { key: "name", direction: "ascending" });
  assert.notEqual(sorted, frozen);
  assert.deepEqual(frozen.map((entry) => entry.rank), [1, 2, 3, 4]);
  assert.equal(sorted[0], frozen[1]);
  assert.equal(sorted[0].isCurrentPlayer, true);
  assert.deepEqual(sortLeaderboardEntries([], { key: "points", direction: "descending" }), []);
});

test("toggles active columns and uses the expected first direction for new columns", () => {
  for (const key of Object.keys(expected) as LeaderboardSortKey[]) {
    assert.deepEqual(getNextLeaderboardSort({ key, direction: "ascending" }, key), { key, direction: "descending" });
    assert.deepEqual(getNextLeaderboardSort({ key, direction: "descending" }, key), { key, direction: "ascending" });
    assert.deepEqual(
      getNextLeaderboardSort({ key: key === "points" ? "name" : "points", direction: "ascending" }, key),
      { key, direction: key === "name" || key === "rank" ? "ascending" : "descending" },
    );
  }
});
