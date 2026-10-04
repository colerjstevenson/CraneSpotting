import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <section className="not-found-content">
      <p className="page-kicker">FIELD NOTE 404</p>
      <h1 className="page-title">Nothing<br />in sight.</h1>
      <p>That page is out of range. Head back to the Crane Spotting board.</p>
      <Link className="app-link app-link--primary" href="/"><ArrowLeft size={16} aria-hidden="true" /> Back to home</Link>
    </section>
  );
}