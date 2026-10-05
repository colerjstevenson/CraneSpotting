import { ArrowDownRight, ArrowRight, Camera, Trophy } from "lucide-react";
import { AppLink } from "@/components/app-link";

export default function Home() {
  return (
    <>
      <section className="home-hero" aria-labelledby="home-title">
        <div className="hero-copy">
          <h1 id="home-title">Crane<br /><span>Spotting</span></h1>
          <div className="hero-actions">
            <AppLink href="/submit" variant="primary"><Camera size={18} aria-hidden="true" /> Submit a crane <ArrowRight size={16} aria-hidden="true" /></AppLink>
            <AppLink href="/leaderboard" variant="quiet"><Trophy size={17} aria-hidden="true" /> View the board</AppLink>
          </div>
          <p className="hero-note"><span>!</span>Best Crane Wins: Points are judged by a custom image model, All points are final!</p>
        </div>
        <aside className="point-guide" aria-labelledby="point-guide-title">
          <header className="point-guide__header">
            <p className="point-guide__eyebrow">THE SCORECARD</p>
            <h2 id="point-guide-title">How points work</h2>
            <p>Every eligible crane photo starts at <strong>10 points.</strong></p>
          </header>
          <dl className="point-guide__types">
            <div><dt>Bird crane</dt><dd>+30</dd></div>
            <div><dt>Construction crane</dt><dd>+10</dd></div>
          </dl>
          <p className="point-guide__bonuses"><strong>Earn more:</strong> +10 each for prominence, a full-crane photo, and interesting composition; +5 per additional crane.</p>
          <div className="point-guide__authenticity">
            <strong>Photo context</strong>
            <span>Live scene ×1 · file upload max ×0.75 · physical display ×0.5 · uncertain ×0.75 · digital or suspected stock/reuse ×0.25</span>
          </div>
          <p className="point-guide__footnote">Photos need at least 70% model confidence. Artwork counts when the physical piece is photographed in its real setting.</p>
        </aside>
      </section>
      <section className="rule-strip" aria-label="Crane Spotting rules">
        <div className="rule-strip__heading"><span>THE RULES</span><ArrowDownRight size={17} aria-hidden="true" /></div>
        <div className="rule-item"><span className="rule-number">01</span><span>Only cranes photographed<br />by you in the wild count<br />but art or depictions are ok</span></div>
        <div className="rule-item"><span className="rule-number">02</span><span>Three crane submission<br />per day,that includes<br />non-cranes you attempt</span></div>
        <div className="rule-item"><span className="rule-number">03</span><span>Bird Cranes are <br />worth more than<br />construction cranes</span></div>
      </section>
      <section className="home-install-tip" aria-labelledby="home-install-title">
        <h2 id="home-install-title">Make it an app</h2>
        <p><strong>iPhone (Safari):</strong> Tap Share, then Add to Home Screen.<br /><strong>Android (Chrome):</strong> Open the browser menu, then Install app or Add to Home screen.</p>
      </section>
    </>
  );
}
