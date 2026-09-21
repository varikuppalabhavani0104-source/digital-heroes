import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { CashfreeError, cashfreeEnv, createSubscription } from "@/lib/cashfree";
import { GRACE_MS } from "@/lib/subscriptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const body = z.object({
  plan: z.enum(["monthly", "yearly"]),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number."),
});

/**
 * Step 1 of checkout: create a Cashfree subscription for the signed-in member and store it
 * as 'incomplete'. It only becomes 'active' after Cashfree confirms a payment (return route / webhook).
 */
export async function POST(req: Request) {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  const { plan, phone } = parsed.data;

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please sign in to subscribe." }, { status: 401 });

  const admin = createAdminClient();

  // Housekeeping: 'active' rows well past their paid-through date are really expired (missed webhook)
  await admin.from("subscriptions").update({ status: "expired" })
    .eq("user_id", user.id).eq("status", "active").lt("current_period_end", new Date(Date.now() - GRACE_MS).toISOString());

  // Guard: one live subscription per member
  const { data: live } = await admin.from("subscriptions").select("id").eq("user_id", user.id).in("status", ["active", "past_due"]).limit(1);
  if (live?.length) return NextResponse.json({ error: "You already have a subscription. Manage it from your dashboard." }, { status: 409 });

  const [{ data: settings }, { data: profile }] = await Promise.all([
    admin.from("app_settings").select("monthly_price_paise, yearly_price_paise").single(),
    admin.from("profiles").select("full_name").eq("id", user.id).single(),
  ]);
  if (!settings) return NextResponse.json({ error: "Pricing isn't available right now." }, { status: 503 });
  const amountPaise = plan === "monthly" ? settings.monthly_price_paise : settings.yearly_price_paise;

  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
  const subId = randomUUID();

  try {
    const cf = await createSubscription({
      id: subId, plan, amountRupees: amountPaise / 100,
      name: profile?.full_name?.trim() || "Member", email: user.email!, phone,
      returnUrl: `${origin}/api/subscribe/return?sid=${subId}`,
    });
    if (!cf.subscription_session_id) throw new CashfreeError("No checkout session was returned.");

    const { error } = await admin.from("subscriptions").insert({
      user_id: user.id, plan, status: "incomplete", amount_paise: amountPaise, provider_subscription_id: subId,
    });
    if (error) throw error;
    await admin.from("profiles").update({ phone }).eq("id", user.id); // needed again for future mandates

    return NextResponse.json({ sessionId: cf.subscription_session_id, mode: cashfreeEnv().mode });
  } catch (e) {
    console.error("[subscribe]", e);
    return NextResponse.json({ error: e instanceof CashfreeError ? e.message : "We couldn't start checkout. Please try again." }, { status: 502 });
  }
}
