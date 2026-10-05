import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ImageOff, Trophy } from "lucide-react";
import { getTopCranes, type TopCrane } from "@/lib/top-cranes";

export const metadata: Metadata = { title: "Top 5 Cranes" };

const craneTitles: Record<TopCrane["craneType"], string> = {
  bird: "Bird crane",
  construction: "Construction crane",
  artwork: "Crane artwork",
  master_crane: "Master Crane",
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  });
}

function CraneCard({ crane, rank }: { crane: TopCrane; rank: number }) {
  const photoLabel = crane.imageUrl ? `${craneTitles[crane.craneType]} photo` : "Photo hidden or unavailable";
  const player = crane.username
    ? <Link href={`/players/${crane.username}`}>{crane.playerName}</Link>
    : <span>{crane.playerName}</span>;

  return (
    <li className={`top-crane-card${rank === 1 ? " top-crane-card--champion" : ""}`}>
      <div className={`top-crane-card__image${crane.imageUrl ? "" : " top-crane-card__image--placeholder"}`}>
        {crane.imageUrl ? (
          <Image
            src={crane.imageUrl}
            alt={photoLabel}
            fill
            sizes={rank === 1 ? "(max-width: 680px) 100vw, 45vw" : "(max-width: 680px) 100vw, 30vw"}
            unoptimized
          />
        ) : (
          <>
            <ImageOff size={rank === 1 ? 42 : 32} aria-hidden="true" />
            <span>{photoLabel}</span>
          </>
        )}
      </div>
      <div className="top-crane-card__details">
        <div className="top-crane-card__rank"><span>ALL-TIME RANK</span><strong>#{String(rank).padStart(2, "0")}</strong></div>
        <p className="top-crane-card__type">{craneTitles[crane.craneType]}</p>
        <p className="top-crane-card__score">{crane.score.toLocaleString("en-US")} <span>PTS</span></p>
        <div className="top-crane-card__byline"><span>SPOTTED BY {player}</span><time dateTime={crane.createdAt}>{formatDate(crane.createdAt)}</time></div>
      </div>
    </li>
  );
}

export default async function TopCranesPage() {
  const result = await getTopCranes();

  return (
    <>
      <section className="page-intro" aria-labelledby="top-cranes-title">
        <h1 className="page-title" id="top-cranes-title">Hall of<br />Cranes</h1>
        <p className="page-description">The highest-scoring crane sightings of all time.</p>
      </section>
      <section className="top-cranes" aria-label="All-time top five crane submissions">
        <div className="top-cranes__banner"><Trophy size={17} aria-hidden="true" /><span>Top 5 Cranes all time</span><span>NO POINTS FOR SECOND PLACE</span></div>
        {result.status === "ready" && result.cranes.length > 0 ? (
          <ol className="top-cranes__grid">
            {result.cranes.map((crane, index) => <CraneCard key={crane.id} crane={crane} rank={index + 1} />)}
          </ol>
        ) : (
          <p className="top-cranes__message" role="status">
            {result.status === "not-configured"
              ? "Connect Supabase to load the all-time records."
              : result.status === "error"
                ? "The crane records couldn't load. Try again soon."
                : "No cranes have made the record board yet."}
          </p>
        )}
        <Link className="top-cranes__back" href="/leaderboard">Back to the leaderboard <ArrowRight size={16} aria-hidden="true" /></Link>
      </section>
    </>
  );
}