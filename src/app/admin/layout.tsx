import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { SignOutButton } from "@/components/SignOutButton";
import { createClient } from "@/lib/supabase/server";

/** `ready: false` items are shown as "soon" so no link ever leads to a broken page. */
const NAV = [
  { href: "/admin", label: "Overview", ready: true },
  { href: "/admin/users", label: "Users", ready: true },
  { href: "/admin/subscriptions", label: "Subscriptions", ready: true },
  { href: "/admin/draws", label: "Draws", ready: true },
  { href: "/admin/charities", label: "Charities", ready: true },
  { href: "/admin/winners", label: "Winners & payouts", ready: true },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Second line of defence (middleware is the first, RLS is the third).
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin");
  const { data: profile } = await supabase.from("profiles").select("role, full_name").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/dashboard");

  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_1fr]">
      <aside className="bg-ink text-white md:sticky md:top-0 md:h-screen md:overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 md:block md:py-6">
          <Logo light />
          <p className="hidden pt-1 text-xs text-ink-300 md:block">Admin console</p>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:block md:space-y-1 md:pb-0" aria-label="Admin">
          {NAV.map((n) =>
            n.ready ? (
              <Link key={n.href} href={n.href} className="block whitespace-nowrap rounded-lg bg-white/10 px-3 py-2 text-sm font-medium">{n.label}</Link>
            ) : (
              <span key={n.href} aria-disabled className="flex cursor-not-allowed items-center justify-between gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm text-ink-300/70">
                {n.label}<span className="rounded bg-white/10 px-1.5 text-[10px]">soon</span>
              </span>
            )
          )}
        </nav>
        <div className="hidden border-t border-white/10 p-3 md:absolute md:bottom-0 md:block md:w-full">
          <Link href="/dashboard" className="block rounded-lg px-3 py-2 text-sm text-ink-300 hover:bg-white/10">View as member</Link>
          <div className="[&_button]:text-ink-300 [&_button:hover]:bg-white/10"><SignOutButton /></div>
        </div>
      </aside>
      <main className="min-w-0 px-4 py-8 sm:px-8">{children}</main>
    </div>
  );
}
