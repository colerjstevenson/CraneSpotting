"use server";

import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/safe-next-path";

export type AuthActionState = { status: "success" | "error"; message: string } | undefined;

function magicLinkRedirect(next: string) {
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const callback = new URL("/auth/confirm", appUrl);
  callback.searchParams.set("next", safeNextPath(next, "/"));
  return callback.toString();
}

function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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
    const supabase = await createClient();
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

    if (error) return { status: "error", message: "We couldn't send that sign-up link. Check your details and try again." };
    return { status: "success", message: "Check your inbox for a link to finish joining Crane Spotting." };
  } catch {
    return { status: "error", message: "Account sign-in is unavailable right now. Check the Supabase setup and try again." };
  }
}

export async function requestLoginLink(_state: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const next = safeNextPath(String(formData.get("next") ?? "/"), "/");

  if (!validEmail(email)) return { status: "error", message: "Enter a valid email address." };
  if (!isSupabaseConfigured()) return { status: "error", message: "Account sign-in is not configured yet." };

  try {
    const supabase = await createClient();
    await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false, emailRedirectTo: magicLinkRedirect(next) },
    });
  } catch {
    return { status: "error", message: "We couldn't send a sign-in link right now. Try again shortly." };
  }

  return { status: "success", message: "If an account exists for that address, a sign-in link is on its way." };
}

export async function signOut() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}