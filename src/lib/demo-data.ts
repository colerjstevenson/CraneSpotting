export type LeaderboardEntry = {
  rank: number;
  name: string;
  cranes: number;
  points: number;
  isCurrentPlayer?: boolean;
};

export const demoLeaderboard: LeaderboardEntry[] = [
  { rank: 1, name: "Sarah Kim", cranes: 34, points: 1284 },
  { rank: 2, name: "Mike Tran", cranes: 29, points: 1193 },
  { rank: 3, name: "Cole Stevenson", cranes: 31, points: 1147, isCurrentPlayer: true },
  { rank: 4, name: "Jessica Moore", cranes: 22, points: 871 },
  { rank: 5, name: "Dave Patel", cranes: 12, points: 422 },
];