"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestLoginLink, requestSignupLink, type AuthActionState } from "@/app/actions/auth";

type AuthFormProps = {
  mode: "login" | "signup";
  next: string;
  notice?: string;
};

const initialState: AuthActionState = undefined;

export function AuthForm({ mode, next, notice }: AuthFormProps) {
  const action = mode === "signup" ? requestSignupLink : requestLoginLink;
  const [state, formAction, pending] = useActionState(action, initialState);
  const isSignup = mode === "signup";
  const switchHref = `${isSignup ? "/login" : "/signup"}?next=${encodeURIComponent(next)}`;

  return (
    <section className="auth-panel" aria-labelledby="auth-form-title">
      <form action={formAction} className="auth-form">
        <h2 id="auth-form-title">{isSignup ? "Make your spotter card" : "Get back in the game"}</h2>
        {notice && <p className="auth-message auth-message--error" role="alert">{notice}</p>}
        {state && <p className={`auth-message auth-message--${state.status}`} role={state.status === "error" ? "alert" : "status"}>{state.message}</p>}
        {isSignup && (
          <>
            <label htmlFor="username">Username</label>
            <input id="username" name="username" autoComplete="username" minLength={3} maxLength={20} pattern="[a-zA-Z0-9_]+" required />
            <span className="auth-hint">3-20 letters, numbers, or underscores.</span>
            <label htmlFor="displayName">Display name</label>
            <input id="displayName" name="displayName" autoComplete="nickname" maxLength={40} required />
          </>
        )}
        <label htmlFor="email">Email address</label>
        <input id="email" name="email" type="email" autoComplete="email" maxLength={254} required />
        <input type="hidden" name="next" value={next} />
        <button className="auth-submit" type="submit" disabled={pending}>
          {pending ? "Sending link..." : isSignup ? "Send my sign-up link" : "Email me a sign-in link"}
        </button>
        <p className="auth-switch">
          {isSignup ? "Already in the flock?" : "New to Crane Spotting?"}{" "}
          <Link href={switchHref}>{isSignup ? "Log in" : "Create an account"}</Link>
        </p>
      </form>
    </section>
  );
}