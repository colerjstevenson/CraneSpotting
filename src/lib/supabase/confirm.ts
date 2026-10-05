import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "../safe-next-path";

function isEmailOtpType(value: string | null): value is EmailOtpType {
  return value !== null && ["email", "signup", "magiclink", "invite", "recovery", "email_change"].includes(value);
}

export async function confirmAuthLink(
  request: NextRequest,
  config: { url: string; publishableKey: string },
) {
  const next = safeNextPath(request.nextUrl.searchParams.get("next"), "/");
  const failureUrl = new URL("/login", request.url);
  failureUrl.searchParams.set("error", "link");
  failureUrl.searchParams.set("next", next);
  const response = NextResponse.redirect(new URL(next, request.url));
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");

  try {
    const supabase = createServerClient(config.url, config.publishableKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });
    const code = request.nextUrl.searchParams.get("code");
    const tokenHash = request.nextUrl.searchParams.get("token_hash");
    const type = request.nextUrl.searchParams.get("type");

    const result = tokenHash && isEmailOtpType(type)
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : code && !tokenHash
        ? await supabase.auth.exchangeCodeForSession(code)
        : null;

    if (!result || result.error) {
      console.error("Auth link verification failed", {
        code: result?.error?.code ?? "invalid_callback",
        status: result?.error?.status,
      });
      response.headers.set("Location", failureUrl.toString());
    }
  } catch (error) {
    console.error("Auth link verification unavailable", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    response.headers.set("Location", failureUrl.toString());
  }

  return response;
}
