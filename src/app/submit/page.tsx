import Link from "next/link";
import { ArrowRight, Camera } from "lucide-react";
import { requirePlayer } from "@/lib/auth";

export const metadata = { title: "Submit a crane" };
export const dynamic = "force-dynamic";

export default async function SubmitPage() {
  await requirePlayer();

  return (
    <>
      <section className="page-intro" aria-labelledby="submit-title">
        <p className="page-kicker">PLAYER 1 / READY?</p>
        <h1 className="page-title" id="submit-title">Submit a<br />crane!</h1>
        <p className="page-description">The photo booth is still under construction. No camera is active and nothing gets uploaded yet.</p>
      </section>
      <section className="submit-panel" aria-label="Camera submission placeholder">
        <div className="camera-mark" aria-hidden="true"><Camera size={43} strokeWidth={1.3} /></div>
        <div className="camera-copy">
          <p className="camera-status"><span /> PHOTO BOOTH / NOT READY</p>
          <h2>Soon, you&apos;ll<br />be in the game.</h2>
          <p>Photo submissions and daily score limits aren&apos;t connected yet.</p>
          <Link className="app-link app-link--primary" href="/leaderboard">Peek at the high scores <ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
      </section>
    </>
  );
}