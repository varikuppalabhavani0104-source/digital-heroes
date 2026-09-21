import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/SiteHeader";
import { LinkButton } from "@/components/ui/Button";
import { SubscribeButton } from "@/components/SubscribeButton";
import { createClient } from "@/lib/supabase/server";
import { effectiveStatus, getCurrentSubscription } from "@/lib/subscriptions";
import { cn, formatINR } from "@/lib/utils";
import { DEFAULTS } from "@/lib/config";
import { cashfreeEnv } from "@/lib/cashfree";

export const metadata: Metadata = { title: "Pricing" };
export const dynamic = "force-dynamic";

const INCLUDED = [
  "Entry into every monthly prize draw",
  "Score tracking for your latest five rounds",
  "Your chosen charity receives a share of every payment",
  "Cancel any time — access lasts until the period you paid for ends",
];

const FAQ = [
  ["What happens if I cancel?", "You keep full access until the end of the period you've already paid for. Nothing is charged after that."],
  ["What if a renewal payment fails?", "We mark your plan as past due while the payment is retried. Draw entry and score changes pause until it succeeds."],
  ["Who handles my payment details?", "Cashfree Payments does. UPI and card details go straight to them — they never touch our servers."],
  ["Can I change how much goes to charity?", "Yes. At least 10% always goes to your chosen cause, and you can raise it from your dashboard."],
];

export default async function PricingPage({ searchParams }: { searchParams: { checkout?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [{ data: settings }, profile, current] = await Promise.all([
    supabase.from("app_settings").select("*").single(),
    user ? supabase.from("profiles").select("full_name, phone").eq("id", user.id).single().then((r) => r.data) : null,
    user ? getCurrentSubscription(supabase, user.id) : null,
  ]);

  const monthly = settings?.monthly_price_paise ?? DEFAULTS.monthlyPaise;
  const yearly = settings?.yearly_price_paise ?? DEFAULTS.yearlyPaise;
  const poolPct = settings?.prize_pool_percent ?? DEFAULTS.prizePoolPercent;
  const charityPct = settings?.min_charity_percent ?? DEFAULTS.minCharityPercent;
  const savePct = Math.round(((monthly * 12 - yearly) / (monthly * 12)) * 100);
  const isTest = cashfreeEnv().mode === "sandbox";
  const status = effectiveStatus(current);
  const live = status === "active" || status === "past_due";
  
  /** Right control for each state: subscribe / sign up / already subscribed. */
  const cta = (plan: "monthly" | "yearly", variant: "primary" | "giving", label: string) =>
    live ? <LinkButton href="/dashboard" variant="secondary" className="w-full py-3.5">You&apos;re subscribed — go to dashboard</LinkButton>
    : user ? <SubscribeButton plan={plan} variant={variant} phone={profile?.phone}>{label}</SubscribeButton>
    : <LinkButton href="/signup" variant={variant} className="w-full py-3.5 text-base">{label}</LinkButton>;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 pb-24 pt-14 sm:px-6 sm:pt-20">
        <div className="max-w-2xl">
          <h1 className="text-4xl font-bold leading-tight sm:text-6xl">Pick a plan. Back a cause.</h1>
          <p className="mt-4 text-lg text-ink-500">Every plan enters you in the monthly draw and sends a share of what you pay to the charity you choose.</p>
        </div>

        {searchParams.checkout === "incomplete" && (
          <p role="status" className="mt-8 rounded-xl bg-danger-100 px-4 py-3 text-sm text-danger">Your payment wasn&apos;t completed, so you haven&apos;t been charged or subscribed. You can try again below.</p>
        )}
        {isTest && (
          <p className="mt-8 rounded-xl border border-sun/50 bg-sun-100 px-4 py-3 text-sm text-ink-700">
            <strong>Test mode:</strong> no real money moves. Choose UPI or card at checkout, then pick <em>Success</em> on Cashfree&apos;s payment simulator.
          </p>
        )}

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <article className="card flex flex-col p-7">
            <h2 className="text-xl font-semibold">Monthly</h2>
            <p className="mt-1 text-sm text-ink-500">Flexible, month to month</p>
            <p className="mt-6 flex items-baseline gap-1"><span className="font-display text-5xl font-bold">{formatINR(monthly)}</span><span className="text-ink-500">/ month</span></p>
            <ul className="mt-6 flex-1 space-y-3 text-sm">{INCLUDED.map((t) => <Tick key={t}>{t}</Tick>)}</ul>
            <div className="mt-8">{cta("monthly", "primary", "Subscribe monthly")}</div>
          </article>

          <article className={cn("relative flex flex-col rounded-xl2 bg-ink p-7 text-white shadow-lift")}>
            <span className="absolute -top-3 right-6 rounded-full bg-sun px-3 py-1 text-xs font-bold text-ink">Save {savePct}%</span>
            <h2 className="text-xl font-semibold">Yearly</h2>
            <p className="mt-1 text-sm text-ink-300">Best value — about {formatINR(Math.round(yearly / 12))} a month</p>
            <p className="mt-6 flex items-baseline gap-1"><span className="font-display text-5xl font-bold">{formatINR(yearly)}</span><span className="text-ink-300">/ year</span></p>
            <ul className="mt-6 flex-1 space-y-3 text-sm text-ink-100">{INCLUDED.map((t) => <Tick key={t} light>{t}</Tick>)}</ul>
            <div className="mt-8">{cta("yearly", "giving", "Subscribe yearly")}</div>
          </article>
        </div>
        {!user && <p className="mt-4 text-sm text-ink-500">You&apos;ll create a free account first, then choose how to pay. Already a member? <Link href="/login?next=/pricing" className="font-semibold text-lagoon-700 hover:underline">Sign in</Link></p>}

        <section className="mt-16" aria-labelledby="split-h">
          <h2 id="split-h" className="text-2xl font-bold">Where each payment goes</h2>
          <p className="mt-1 text-ink-500">Shown for the monthly plan of {formatINR(monthly)}.</p>
          <div className="mt-6 flex h-4 overflow-hidden rounded-full" role="img" aria-label={`${poolPct}% prize pool, at least ${charityPct}% charity, remainder running costs`}>
            <div className="bg-sun" style={{ width: `${poolPct}%` }} />
            <div className="bg-lagoon" style={{ width: `${charityPct}%` }} />
            <div className="flex-1 bg-ink-100" />
          </div>
          <dl className="mt-4 grid gap-4 sm:grid-cols-3">
            <Split color="bg-sun" label="Prize pool" value={formatINR((monthly * poolPct) / 100)} note={`${poolPct}% shared among winners`} />
            <Split color="bg-lagoon" label="Your charity" value={`${formatINR((monthly * charityPct) / 100)}+`} note={`At least ${charityPct}% — you can give more`} />
            <Split color="bg-ink-100" label="Running the platform" value={formatINR((monthly * (100 - poolPct - charityPct)) / 100)} note="Payments, hosting and support" />
          </dl>
        </section>

        <section className="mt-16" aria-labelledby="faq-h">
          <h2 id="faq-h" className="text-2xl font-bold">Questions</h2>
          <div className="mt-4 divide-y divide-ink-100 rounded-xl2 border border-ink-100 bg-white">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group px-5 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between font-medium">{q}<span aria-hidden className="text-ink-300 transition group-open:rotate-45">+</span></summary>
                <p className="mt-2 text-sm text-ink-500">{a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}

function Tick({ children, light }: { children: React.ReactNode; light?: boolean }) {
  return (
    <li className="flex gap-3">
      <svg className={cn("mt-0.5 h-5 w-5 shrink-0", light ? "text-sun" : "text-lagoon")} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m4 10.5 4 4 8-9" /></svg>
      <span>{children}</span>
    </li>
  );
}

function Split({ color, label, value, note }: { color: string; label: string; value: string; note: string }) {
  return (
    <div>
      <dt className="flex items-center gap-2 text-sm text-ink-500"><span className={cn("h-2.5 w-2.5 rounded-full", color)} />{label}</dt>
      <dd className="mt-1 font-display text-2xl font-bold">{value}</dd>
      <dd className="text-sm text-ink-500">{note}</dd>
    </div>
  );
}
