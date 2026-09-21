import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { fetchSubscription } from "@/lib/cashfree";
import { applyStatus, recordPayment } from "@/lib/subscriptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Where Cashfree sends the member's browser after checkout (it may be a POST).
 * We deliberately IGNORE anything in the request and ask Cashfree's API for the truth,
 * so this URL cannot be used to fake a payment. No login cookie is needed either
 * (browsers drop SameSite cookies on cross-site POSTs) — we finish by redirecting to /dashboard.
 */
async function handle(req: Request) {
  const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;
  const go = (path: string) => NextResponse.redirect(new URL(path, origin), 303);

  const sid = new URL(req.url).searchParams.get("sid");
  if (!sid) return go("/dashboard");

  const admin = createAdminClient();
  const { data: row } = await admin.from("subscriptions").select("id, amount_paise").eq("provider_subscription_id", sid).maybeSingle();
  if (!row) return go("/pricing");

  try {
    const cf = await fetchSubscription(sid);
    const auth = cf.authorisation_details ?? cf.authorization_details;

    if (cf.subscription_status === "ACTIVE") {
      // The authorisation payment IS the first cycle's charge
      await recordPayment(admin, sid, `auth:${sid}`, auth?.authorization_amount ?? row.amount_paise / 100);
      await applyStatus(admin, sid, cf.subscription_status, Date.now());
      return go("/dashboard?subscribed=1");
    }
    if (cf.subscription_status === "BANK_APPROVAL_PENDING") return go("/dashboard?subscribed=pending");
    return go("/pricing?checkout=incomplete"); // abandoned or failed — nothing was activated
  } catch (e) {
    console.error("[subscribe/return]", e);
    return go("/dashboard?subscribed=pending"); // the webhook will finish the job
  }
}

export const GET = handle;
export const POST = handle;
