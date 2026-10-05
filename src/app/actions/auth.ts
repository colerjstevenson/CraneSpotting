"use server";

import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/safe-next-path";
import { validEmail, verifyEmailCode } from "@/lib/supabase/email-code";

export type AuthActionState = { status: "success" | "error"; message: string } | undefined;

function magicLinkRedirect(next: string) {
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const callback = new URL("/auth/confirm", appUrl);
  callback.searchParams.set("next", safeNextPath(next, "/"));
  return callback.toString();
}

function signupErrorMessage(code: string | undefined, message: string) {
  const detail = `${code ?? ""} ${message}`.toLowerCase();

  if (detail.includes("rate limit") || detail.includes("too many requests")) {
    return "Too many sign-up emails were requested. Wait a few minutes, then try again.";
  }
  if (detail.includes("redirect") && detail.includes("url")) {
    return "Sign-up links are not configured for this site yet. Please contact the site owner.";
  }
  if (detail.includes("email") && (detail.includes("send") || detail.includes("smtp") || detail.includes("provider"))) {
    return "Sign-up email delivery is temporarily unavailable. Please contact the site owner.";
  }

  return "We couldn't send that sign-up link. Check your details and try again.";
}

export async function requestSignupLink(_state: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const next = safeNextPath(String(formData.get("next") ?? "/"), "/");

  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    return { status: "error", message: "Username must be 3-20 characters: lowercase letters, numbers, or underscores." };
  }
  if (!displayName || displayName.length > 40) {
    return { status: "error", message: "Display name must be between 1 and 40 characters." };
  }
  if (!validEmail(email)) return { status: "error", message: "Enter a valid email address." };
  if (!isSupabaseConfigured()) return { status: "error", message: "Account sign-in is not configured yet." };

  try {
    const supabase = await createClient({ requireCookieWrites: true });
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("username", username)
      .maybeSingle();

    if (existing) return { status: "error", message: "That username is already taken. Try another." };

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: magicLinkRedirect(next),
        data: { username, display_name: displayName },
      },
    });

    if (error) {
      console.error("Signup link request failed", {
        code: error.code,
        status: error.status,
        message: error.message,
      });
      return { status: "error", message: signupErrorMessage(error.code, error.message) };
    }
    return { status: "success", message: "Check your inbox. Enter the code below to finish joining here, or use the email link." };
  } catch (error) {
    console.error("Signup email request unavailable", { name: error instanceof Error ? error.name : "UnknownError" });
    return { status: "error", message: "Account sign-in is unavailable right now. Check the Supabase setup and try again." };
  }
}

export async function requestLoginLink(_state: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const next = safeNextPath(String(formData.get("next") ?? "/"), "/");

  if (!validEmail(email)) return { status: "error", message: "Enter a valid email address." };
  if (!isSupabaseConfigured()) return { status: "error", message: "Account sign-in is not configured yet." };

  try {
    const supabase = await createClient({ requireCookieWrites: true });
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false, emailRedirectTo: magicLinkRedirect(next) },
    });
    if (error) {
      console.error("Login email request failed", { code: error.code, status: error.status });
      // Keep unknown accounts indistinguishable from successful requests.
      if (!["signup_disabled", "otp_disabled", "user_not_found"].includes(error.code ?? "")) {
        return { status: "error", message: "We couldn't send a sign-in email. Wait a few minutes, then try again." };
      }
    }
  } catch (error) {
    console.error("Login email request unavailable", { name: error instanceof Error ? error.name : "UnknownError" });
    return { status: "error", message: "We couldn't send a sign-in email right now. Try again shortly." };
  }

  return { status: "success", message: "If an account exists for that address, an email is on its way. Enter its code below to sign in here, or use the link." };
}

export async function confirmEmailCode(_state: AuthActionState, formData: FormData): Promise<AuthActionState> {
  if (!isSupabaseConfigured()) return { status: "error", message: "Account sign-in is not configured yet." };

  const result = await verifyEmailCode(formData, () => createClient({ requireCookieWrites: true }));
  if (result.status === "error") return result;
  redirect(result.next);
}

export async function signOut() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}