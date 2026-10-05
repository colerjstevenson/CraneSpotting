import type { SupabaseClient } from "@supabase/supabase-js";
import { safeNextPath } from "../safe-next-path";

export function validEmail(email: string) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

type CodeVerificationResult =
  | { status: "success"; next: string }
  | { status: "error"; message: string };

export async function verifyEmailCode(
  formData: FormData,
  createClient: () => Promise<Pick<SupabaseClient, "auth">>,
): Promise<CodeVerificationResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const token = String(formData.get("token") ?? "").trim();
  const next = safeNextPath(String(formData.get("next") ?? "/"), "/");

  if (!validEmail(email)) return { status: "error", message: "Enter a valid email address." };
  if (!/^[0-9]{6,10}$/.test(token)) {
    return { status: "error", message: "Enter the 6-10 digit code from your email." };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
    if (error) {
      console.error("Email code verification failed", { code: error.code, status: error.status });
      return {
        status: "error",
        message: error.status === 429
          ? "Too many attempts. Wait a few minutes, then try again."
          : "That code is invalid or expired. Use the newest email, or request a fresh one.",
      };
    }
    if (!data.session) {
      console.error("Email code verification failed", { code: "missing_session" });
      return { status: "error", message: "Sign-in did not complete. Request a fresh email and try again." };
    }
    return { status: "success", next };
  } catch (error) {
    console.error("Email code verification unavailable", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return { status: "error", message: "We couldn't verify that code right now. Try again shortly." };
  }
}
