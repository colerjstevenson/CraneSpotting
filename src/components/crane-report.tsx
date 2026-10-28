import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Camera, Crown, Sparkles, Trophy } from "lucide-react";
import type { CraneReport } from "@/lib/crane-reports";
import { ScoreBreakdown } from "@/components/score-breakdown";

type CraneReportViewProps = {
  report: CraneReport;
};

const craneTitles: Record<CraneReport["craneType"], string> = {
  bird: "BIRD CRANE",
  construction: "CONSTRUCTION CRANE",
  artwork: "CRANE ARTWORK",
  master_crane: "MASTER CRANE",
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  });
}

export function CraneReportView({ report }: CraneReportViewProps) {
  const isMasterCrane = report.craneType === "master_crane";
  const remaining = report.remainingSubmissions;

  return (
    <article className={`crane-report crane-report--${report.craneType}`} aria-labelledby="report-title">
      <header className="crane-report__masthead">
        <p className="crane-report__kicker">
          {isMasterCrane ? <Crown size={16} aria-hidden="true" /> : <Sparkles size={15} aria-hidden="true" />}
          {isMasterCrane ? "EXTRAORDINARY SIGHTING" : "FIELD REPORT / VERIFIED"}
        </p>
        <h1 id="report-title">{isMasterCrane ? "MASTER CRANE\nDETECTED" : `${craneTitles[report.craneType]}\nDETECTED`}</h1>
        {isMasterCrane && <p className="crane-report__master-copy">This is not merely a crane. This is MASTER CRANE.</p>}
      </header>

      <div className="crane-report__body">
        <div className="crane-report__photo">
          {report.imageUrl ? (
            <Image src={report.imageUrl} alt={`${craneTitles[report.craneType]} submission`} fill sizes="(max-width: 760px) 100vw, 42vw" unoptimized />
          ) : (
            <div className="crane-report__photo-missing" role="img" aria-label="Submission photo is unavailable">
              <Camera size={32} aria-hidden="true" />
              <span>PHOTO UNAVAILABLE</span>
            </div>
          )}
          <span className="crane-report__photo-label">CRANE SPOTTING / {formatDate(report.createdAt)}</span>
        </div>

        <div className="crane-report__details">
          <div className="crane-report__score-block">
            <span className="crane-report__eyebrow">CRANE SCORE</span>
            <strong className="crane-report__score">{report.score.toLocaleString("en-US")}</strong>
            <span className="crane-report__points-label">CRANE POINTS</span>
          </div>

          <div className="crane-report__stats">
            <div>
              <span>LEADERBOARD RANK</span>
              <strong>{report.rank === null ? "--" : `#${report.rank}`}</strong>
              {report.rank === null && <small>Rank unavailable</small>}
            </div>
            <div>
              <span>SHOTS LEFT TODAY</span>
              <strong>{remaining === null ? "--" : remaining}</strong>
              {remaining === null && <small>Daily count unavailable</small>}
            </div>
          </div>

          <ScoreBreakdown breakdown={report.scoreBreakdown} craneType={report.craneType} score={report.score} label={craneTitles[report.craneType]} />

          <nav className="crane-report__actions" aria-label="Report actions">
            {remaining !== null && remaining > 0 ? (
              <Link className="crane-report__action crane-report__action--primary" href="/submit">
                <Camera size={17} aria-hidden="true" /> Spot another <ArrowRight size={16} aria-hidden="true" />
              </Link>
            ) : (
              <p className="crane-report__quota-note">
                {remaining === 0 ? "That's all three shots for today. Come back tomorrow." : "Your remaining shots could not be checked."}
              </p>
            )}
            <Link className="crane-report__action crane-report__action--secondary" href="/leaderboard">
              <Trophy size={17} aria-hidden="true" /> Leaderboard
            </Link>
          </nav>
        </div>
      </div>
    </article>
  );
}