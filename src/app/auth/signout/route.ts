import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** POST-only so it can't be triggered by a stray link/prefetch. */
export async function POST(request: Request) {
  await createClient().auth.signOut();
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
