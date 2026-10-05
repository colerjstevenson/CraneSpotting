import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Camera, Crown, Sparkles, Trophy } from "lucide-react";
import type { CraneReport } from "@/lib/crane-reports";

type CraneReportViewProps = {
  report: CraneReport;
};

const craneTitles: Record<CraneReport["craneType"], string> = {
  bird: "BIRD CRANE",
  construction: "CONSTRUCTION CRANE",
  artwork: "CRANE ARTWORK",
  master_crane: "MASTER CRANE",
};

const breakdownTitles: Record<string, string> = {
  base_crane: "Base crane",
  crane_type_bonus: "Crane type bonus",
  prominence_bonus: "Large / prominent",
  full_crane_visible_bonus: "Full crane visible",
  interesting_composition_bonus: "Interesting composition",
  additional_cranes_bonus: "Additional cranes",
  master_crane_bonus: "Master Crane bonus",
  crane_artwork_points: "Crane artwork",
};

function formatBreakdownTitle(key: string, craneType: CraneReport["craneType"]) {
  if (key === "crane_type_bonus") {
    return craneType === "bird" ? "Bird crane" : "Construction crane";
  }
  return breakdownTitles[key] ?? key.replaceAll("_", " ");
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  });
}

export function CraneReportView({ report }: CraneReportViewProps) {
  const pointEntries = Object.entries(report.scoreBreakdown)
    .filter(([key, value]) => key !== "authenticity_multiplier" && value !== 0);
  const authenticityMultiplier = report.scoreBreakdown.authenticity_multiplier;
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

          <section className="crane-report__breakdown" aria-labelledby="breakdown-title">
            <div className="crane-report__section-heading">
              <h2 id="breakdown-title">SCORE BREAKDOWN</h2>
              <span>{craneTitles[report.craneType]}</span>
            </div>
            {pointEntries.length > 0 ? (
              <ul>
                {pointEntries.map(([key, value]) => (
                  <li key={key}>
                    <span>{formatBreakdownTitle(key, report.craneType)}</span>
                    <strong>+{value.toLocaleString("en-US")}</strong>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="crane-report__no-breakdown">This sighting earned its points in one decisive move.</p>
            )}
            {typeof authenticityMultiplier === "number" && authenticityMultiplier !== 1 && (
              <p className="crane-report__multiplier">
                Point subtotal adjusted by an authenticity factor of ×{authenticityMultiplier.toLocaleString("en-US", { maximumFractionDigits: 2 })}.
              </p>
            )}
          </section>

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