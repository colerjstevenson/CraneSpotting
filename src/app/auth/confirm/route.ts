import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseConfig, isSupabaseConfigured } from "@/lib/supabase/config";
import { confirmAuthLink } from "@/lib/supabase/confirm";

export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(new URL("/login?error=setup", request.url));
  }

  return confirmAuthLink(request, getSupabaseConfig());
}