import type { Metadata } from "next";
import { CancelSubscription } from "@/components/CancelSubscription";
import { LinkButton } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/server";
import { effectiveStatus, getCurrentSubscription, hasActiveSubscription } from "@/lib/subscriptions";
import { formatDate, formatINR } from "@/lib/utils";

export const metadata: Metadata = { title: "Your dashboard" };
export const dynamic = "force-dynamic"; // always reflects the live subscription state

const BADGE: Record<string, string> = {
  active: "bg-lagoon-100 text-lagoon-700",
  past_due: "bg-sun-100 text-sun-700",
  cancelled: "bg-danger-100 text-danger",
  expired: "bg-danger-100 text-danger",
  inactive: "bg-ink-100 text-ink-700",
};

export default async function DashboardPage({ searchParams }: { searchParams: { subscribed?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: profile }, sub, entitled] = await Promise.all([
    supabase.from("profiles").select("full_name, charity_percent, charities(name, category)").eq("id", user!.id).single(),
    getCurrentSubscription(supabase, user!.id),
    hasActiveSubscription(supabase), // real-time entitlement check on every request
  ]);

  const charity = profile?.charities as unknown as { name: string; category: string } | null;
  const status = effectiveStatus(sub);
  const firstName = profile?.full_name?.split(" ")[0] || "there";
  const endDate = sub?.current_period_end ? formatDate(sub.current_period_end) : "";

  return (
    <div className="animate-rise space-y-6">
      {searchParams.subscribed === "1" && entitled && (
        <p role="status" className="rounded-xl bg-lagoon-100 px-4 py-3 text-sm font-medium text-lagoon-700">🎉 You&apos;re in! Your subscription is active and your charity is already benefiting.</p>
      )}
      {searchParams.subscribed === "pending" && !entitled && (
        <p role="status" className="rounded-xl bg-sun-100 px-4 py-3 text-sm font-medium text-sun-700">Payment received — we&apos;re activating your subscription. Refresh in a few seconds.</p>
      )}

      <div>
        <h1 className="text-3xl font-bold">Hi {firstName} 👋</h1>
        <p className="mt-1 text-ink-500">Here&apos;s where you stand this month.</p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <section className="card p-6" aria-labelledby="sub-h">
          <h2 id="sub-h" className="text-sm font-medium text-ink-500">Subscription</h2>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span className={`rounded-full px-3 py-1 text-sm font-semibold capitalize ${BADGE[status]}`}>{status.replace("_", " ")}</span>
            {sub && <span className="text-sm capitalize text-ink-500">{sub.plan} · {formatINR(sub.amount_paise)}</span>}
          </div>

          <div className="mt-4 space-y-3 text-sm text-ink-500">
            {status === "inactive" && <>
              <p>Subscribe to unlock score entry and the monthly draw.</p>
              <LinkButton href="/pricing" variant="giving">Choose a plan</LinkButton>
            </>}
            {status === "active" && !sub?.cancel_at_period_end && <>
              <p>Renews on <strong className="text-ink">{endDate}</strong>.</p>
              <CancelSubscription endsOn={endDate} />
            </>}
            {status === "active" && sub?.cancel_at_period_end && (
              <p>Cancelled. You keep full access until <strong className="text-ink">{endDate}</strong>.</p>
            )}
            {status === "past_due" && (
              <p className="rounded-xl bg-sun-100 p-3 text-sun-700">Your last renewal payment didn&apos;t go through. We&apos;re retrying automatically — draw entry and score changes are paused until it succeeds.</p>
            )}
            {(status === "cancelled" || status === "expired") && <>
              <p>Your subscription ended{endDate ? ` on ${endDate}` : ""}. Resubscribe to rejoin the draw.</p>
              <LinkButton href="/pricing" variant="giving">Resubscribe</LinkButton>
            </>}
          </div>
        </section>

        <section className="card p-6" aria-labelledby="ch-h">
          <h2 id="ch-h" className="text-sm font-medium text-ink-500">Your cause</h2>
          {charity ? (
            <>
              <p className="mt-3 font-display text-xl font-bold">{charity.name}</p>
              <p className="text-sm text-lagoon-700">{charity.category}</p>
              <p className="mt-4 text-sm text-ink-500">
                <span className="font-semibold text-ink">{profile?.charity_percent}%</span> of your subscription goes to this charity.
              </p>
            </>
          ) : (
            <p className="mt-3 text-sm text-ink-500">You haven&apos;t chosen a charity yet.</p>
          )}
        </section>
      </div>
    </div>
  );
}
