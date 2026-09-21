import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Runs on every request: refreshes the auth session and gates routes.
 *  - /dashboard/*  → must be signed in
 *  - /admin/*      → must be signed in AND profiles.role = 'admin'
 *  - /login,/signup → bounce signed-in users to their dashboard
 * (Data access is ALSO enforced by RLS — this is defence in depth.)
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(list) {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const redirect = (to: string, next?: string) => {
    const url = request.nextUrl.clone();
    url.pathname = to;
    url.search = next ? `?next=${encodeURIComponent(next)}` : "";
    return NextResponse.redirect(url);
  };

  const isProtected = path.startsWith("/dashboard") || path.startsWith("/admin");
  if (isProtected && !user) return redirect("/login", path);

  if (path.startsWith("/admin") && user) {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") return redirect("/dashboard");
  }

  if ((path === "/login" || path === "/signup") && user) return redirect("/dashboard");

  return response;
}
