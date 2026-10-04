import Link from "next/link";
import { ArrowDownRight, ArrowRight, Camera, Trophy } from "lucide-react";
import { AppLink } from "@/components/app-link";
import { LeaderboardTable } from "@/components/leaderboard-table";
import { demoLeaderboard } from "@/lib/demo-data";

export default function Home() {
  return (
    <>
      <section className="home-hero" aria-labelledby="home-title">
        <div className="hero-copy">
          <p className="eyebrow"><span className="eyebrow-dot" /> THE CRANE SPOTTING GAME!</p>
          <h1 id="home-title">Look up.<br /><span>Score big.</span></h1>
          <p className="hero-description">Find cranes out in the wild. Chase the high score. Have a ridiculously good time.</p>
          <div className="hero-actions">
            <AppLink href="/submit" variant="primary"><Camera size={18} aria-hidden="true" /> Submit a crane <ArrowRight size={16} aria-hidden="true" /></AppLink>
            <AppLink href="/leaderboard" variant="quiet"><Trophy size={17} aria-hidden="true" /> View the board</AppLink>
          </div>
          <p className="hero-note"><span>!</span> Photo submissions are coming soon.</p>
        </div>
        <aside className="board-preview" aria-labelledby="preview-title">
          <div className="board-preview__masthead">
            <div className="board-preview__label"><span className="sample-tag">DEMO SCORES</span><span>ROUND 01</span></div>
            <div className="board-preview__illustration" aria-hidden="true">
              <span className="illustration-crosshair illustration-crosshair--one" />
              <span className="illustration-crosshair illustration-crosshair--two" />
              <span className="construction-icon" />
              <span className="illustration-caption">LOOK UP<br />THERE</span>
            </div>
            <div className="board-preview__title-row">
              <div><p className="board-kicker">HIGH SCORES</p><h2 id="preview-title">Top spotters</h2></div>
              <span className="round-index">TOP 05</span>
            </div>
          </div>
          <LeaderboardTable entries={demoLeaderboard.slice(0, 3)} compact />
          <Link className="board-preview__link" href="/leaderboard">See all the scores <ArrowRight size={16} aria-hidden="true" /></Link>
        </aside>
      </section>
      <section className="rule-strip" aria-label="Crane Spotting rules">
        <div className="rule-strip__heading"><span>THE RULES</span><ArrowDownRight size={17} aria-hidden="true" /></div>
        <div className="rule-item"><span className="rule-number">01</span><span>One global<br />leaderboard</span></div>
        <div className="rule-item"><span className="rule-number">02</span><span>Three crane<br />spots per day</span></div>
        <div className="rule-item"><span className="rule-number">03</span><span>Look up.<br />Have fun.</span></div>
      </section>
    </>
  );
}
