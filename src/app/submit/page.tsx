import { requirePlayer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CraneCamera } from "@/components/crane-camera";

export const metadata = { title: "Submit a crane" };
export const dynamic = "force-dynamic";

export default async function SubmitPage() {
  await requirePlayer();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_daily_submission_count");

  return (
    <>
      <section className="page-intro" aria-labelledby="submit-title">
        <p className="page-kicker">PHOTO BOOTH / LIVE</p>
        <h1 className="page-title" id="submit-title">Submit a<br />crane!</h1>
        <p className="page-description">Three shots a day. Make each one count.</p>
      </section>
      <CraneCamera key={error ? "unavailable" : Number(data ?? 0)} initialAttemptsToday={error ? null : Number(data ?? 0)} />
    </>
  );
}