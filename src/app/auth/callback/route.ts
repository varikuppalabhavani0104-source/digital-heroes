import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Completes email-confirmation / magic-link sign-ins. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  if (code) {
    const { error } = await createClient().auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}/dashboard`);
  }
  return NextResponse.redirect(`${origin}/login?error=confirm`);
}
