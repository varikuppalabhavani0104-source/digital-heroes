import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const path = request.nextUrl.searchParams.get("path");

  if (!path) {
    return new NextResponse("Missing proof path", { status: 400 });
  }

  const { data, error } = await supabase.storage
    .from("winner-proofs")
    .createSignedUrl(path, 300);

  if (error || !data?.signedUrl) {
    return new NextResponse(
      error?.message || "Could not create proof URL",
      { status: 404 }
    );
  }

  return NextResponse.redirect(data.signedUrl);
}