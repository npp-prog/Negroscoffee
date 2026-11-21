import { NextResponse, type NextRequest } from "next/server";

import { safeNext } from "@/lib/auth";
import { getServerSupabase } from "@/lib/supabase/server";

/** Magic link and Google OAuth both land here with ?code= (PKCE). */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));
  if (code) {
    const supabase = await getServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }
  const fail = new URL("/login", origin);
  fail.searchParams.set("error", "link");
  fail.searchParams.set("next", next);
  return NextResponse.redirect(fail);
}
