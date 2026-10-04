import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/safe-next-path";

export async function GET(request: NextRequest) {
  const next = safeNextPath(request.nextUrl.searchParams.get("next"), "/");
  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(new URL("/login?error=setup", request.url));
  }

  try {
    const supabase = await createClient();
    const code = request.nextUrl.searchParams.get("code");
    const tokenHash = request.nextUrl.searchParams.get("token_hash");
    const type = request.nextUrl.searchParams.get("type");
    let error: Error | null = null;

    if (code) {
      ({ error } = await supabase.auth.exchangeCodeForSession(code));
    } else if (tokenHash && type) {
      ({ error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as EmailOtpType }));
    } else {
      return NextResponse.redirect(new URL("/login?error=link", request.url));
    }

    if (error) return NextResponse.redirect(new URL("/login?error=link", request.url));
    return NextResponse.redirect(new URL(next, request.url));
  } catch {
    return NextResponse.redirect(new URL("/login?error=link", request.url));
  }
}