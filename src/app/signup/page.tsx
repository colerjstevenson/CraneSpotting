import { AuthForm } from "@/app/auth/form";
import { safeNextPath } from "@/lib/safe-next-path";

export const metadata = { title: "Join Crane Spotting" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const params = await searchParams;

  return (
    <>
      <section className="page-intro" aria-labelledby="signup-title">
        <p className="page-kicker">NEW PLAYER / STEP RIGHT UP</p>
        <h1 className="page-title" id="signup-title">Join the<br />spotters!</h1>
        <p className="page-description">Claim your name on the board. We’ll email you a sign-in link; no password to remember.</p>
      </section>
      <AuthForm mode="signup" next={safeNextPath(params.next, "/submit")} />
    </>
  );
}