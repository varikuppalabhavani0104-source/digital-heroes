import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { CashfreeError, cancelSubscription } from "@/lib/cashfree";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stops future debits at Cashfree immediately. The member keeps access until the end of the
 * period they already paid for (cancel_at_period_end), so nothing they paid for is taken away.
 */
export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  const admin = createAdminClient();
  const { data: sub } = await admin.from("subscriptions").select("id, provider_subscription_id, current_period_end")
    .eq("user_id", user.id).eq("status", "active").eq("cancel_at_period_end", false).maybeSingle();
  if (!sub) return NextResponse.json({ error: "There's no active subscription to cancel." }, { status: 404 });

  try {
    await cancelSubscription(sub.provider_subscription_id);
    await admin.from("subscriptions").update({ cancel_at_period_end: true, updated_at: new Date().toISOString() }).eq("id", sub.id);
    return NextResponse.json({ ok: true, endsAt: sub.current_period_end });
  } catch (e) {
    console.error("[cancel]", e);
    return NextResponse.json({ error: e instanceof CashfreeError ? e.message : "We couldn't cancel right now. Please try again." }, { status: 502 });
  }
}
