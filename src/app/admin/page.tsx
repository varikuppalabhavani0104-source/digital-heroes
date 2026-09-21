import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Admin overview" };

export default async function AdminOverview() {
  const supabase = createClient();
  // Admin RLS policies let these queries see every row.
  const [users, active, contrib] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("subscriptions").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("charity_contributions").select("amount_paise"),
  ]);
  const charityTotal = (contrib.data ?? []).reduce((s, r) => s + r.amount_paise, 0);

  const stats = [
    { label: "Total users", value: users.count ?? 0 },
    { label: "Active subscriptions", value: active.count ?? 0 },
    { label: "Charity contributions", value: `₹${(charityTotal / 100).toLocaleString("en-IN")}` },
  ];

  return (
    <div className="animate-rise">
      <h1 className="text-3xl font-bold">Overview</h1>
      <p className="mt-1 text-ink-500">Live numbers from your database.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="card p-5">
            <p className="text-sm text-ink-500">{s.label}</p>
            <p className="mt-2 font-display text-3xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
