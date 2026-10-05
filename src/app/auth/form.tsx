"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { confirmEmailCode, requestLoginLink, requestSignupLink, type AuthActionState } from "@/app/actions/auth";

type AuthFormProps = {
  mode: "login" | "signup";
  next: string;
  notice?: string;
};

const initialState: AuthActionState = undefined;

export function AuthForm({ mode, next, notice }: AuthFormProps) {
  const action = mode === "signup" ? requestSignupLink : requestLoginLink;
  const [requestedEmail, setRequestedEmail] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState(async (previous: AuthActionState, formData: FormData) => {
    const result = await action(previous, formData);
    if (result?.status === "success") {
      setRequestedEmail(String(formData.get("email") ?? "").trim().toLowerCase());
    }
    return result;
  }, initialState);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const isSignup = mode === "signup";
  const switchHref = `${isSignup ? "/login" : "/signup"}?next=${encodeURIComponent(next)}`;

  return (
    <section className="auth-panel" aria-labelledby={requestedEmail ? "auth-code-title" : "auth-form-title"}>
      {requestedEmail ? (
        <EmailCodeForm email={requestedEmail} next={next} message={state?.message} onBack={() => setRequestedEmail(null)} />
      ) : (
        <form action={formAction} className="auth-form">
          <h2 id="auth-form-title">{isSignup ? "Make your spotter card" : "Get back in the game"}</h2>
          {notice && <p className="auth-message auth-message--error" role="alert">{notice}</p>}
          {state?.status === "error" && <p className="auth-message auth-message--error" role="alert">{state.message}</p>}
          {isSignup && (
            <>
              <label htmlFor="username">Username</label>
              <input id="username" name="username" autoComplete="username" minLength={3} maxLength={20} pattern="[a-zA-Z0-9_]+" value={username} onChange={(event) => setUsername(event.target.value)} required />
              <span className="auth-hint">3-20 letters, numbers, or underscores.</span>
              <label htmlFor="displayName">Display name</label>
              <input id="displayName" name="displayName" autoComplete="nickname" maxLength={40} value={displayName} onChange={(event) => setDisplayName(event.target.value)} required />
            </>
          )}
          <label htmlFor="email">Email address</label>
          <input id="email" name="email" type="email" autoComplete="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} required />
          <input type="hidden" name="next" value={next} />
          <button className="auth-submit" type="submit" disabled={pending}>
            {pending ? "Sending email..." : isSignup ? "Send my sign-up email" : "Email me a code and link"}
          </button>
          <p className="auth-switch">
            {isSignup ? "Already in the flock?" : "New to Crane Spotting?"}{" "}
            <Link href={switchHref}>{isSignup ? "Log in" : "Create an account"}</Link>
          </p>
        </form>
      )}
    </section>
  );
}

function EmailCodeForm({ email, next, message, onBack }: {
  email: string;
  next: string;
  message?: string;
  onBack: () => void;
}) {
  const [codeState, codeAction, verifying] = useActionState(confirmEmailCode, initialState);

  return (
    <form action={codeAction} className="auth-form" aria-labelledby="auth-code-title">
      <h2 id="auth-code-title">Check your email</h2>
      {message && <p className="auth-message auth-message--success" role="status">{message}</p>}
      <p className="auth-switch">Enter the code sent to <strong>{email}</strong>.</p>
      <p className="auth-switch">Using the home-screen app? Enter your email code here instead of opening the link. This signs you in right here.</p>
      {codeState && <p className={`auth-message auth-message--${codeState.status}`} role={codeState.status === "error" ? "alert" : "status"}>{codeState.message}</p>}
      <input type="hidden" name="email" value={email} />
      <label htmlFor="email-code">Email code</label>
      <input id="email-code" name="token" type="text" inputMode="numeric" autoComplete="one-time-code" autoFocus minLength={6} maxLength={10} pattern="[0-9]{6,10}" aria-describedby="email-code-hint" required />
      <span id="email-code-hint" className="auth-hint">Use the code from your newest email. The code and link are single-use alternatives.</span>
      <input type="hidden" name="next" value={next} />
      <button className="auth-submit" type="submit" disabled={verifying}>
        {verifying ? "Checking code..." : "Verify code and sign in"}
      </button>
      <button className="auth-submit" type="button" onClick={onBack} disabled={verifying}>Change email or request a new code</button>
    </form>
  );
}