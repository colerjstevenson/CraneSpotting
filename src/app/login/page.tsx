import { AuthForm } from "@/app/auth/form";
import { safeNextPath } from "@/lib/safe-next-path";

export const metadata = { title: "Log in" };

const loginNotices: Record<string, string> = {
  link: "That sign-in link is invalid or expired. Request a fresh one below.",
  setup: "Sign-in is not configured yet. Please try again later.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const params = await searchParams;

  return (
    <>
      <section className="page-intro" aria-labelledby="login-title">
        <p className="page-kicker">RETURNING PLAYER / WELCOME BACK</p>
        <h1 className="page-title" id="login-title">Back for<br />more?</h1>
        <p className="page-description">Enter your email and we’ll send a fresh sign-in link.</p>
      </section>
      <AuthForm mode="login" next={safeNextPath(params.next, "/")} notice={params.error ? loginNotices[params.error] : undefined} />
    </>
  );
}