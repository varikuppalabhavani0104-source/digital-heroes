import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { verifyWebhookSignature } from "@/lib/cashfree";
import { applyStatus, recordPayment } from "@/lib/subscriptions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cashfree → us. The source of truth for the subscription lifecycle:
 *   SUBSCRIPTION_PAYMENT_SUCCESS   → paid: extend paid-through date, charity ledger row, active
 *   SUBSCRIPTION_PAYMENT_FAILED    → (renewal) past_due
 *   SUBSCRIPTION_STATUS_CHANGED    → active / past_due (ON_HOLD) / cancelled / expired ...
 * Security: signature over timestamp + RAW body. Reliability: idempotent (event log + payment key);
 * we return 500 on failure so Cashfree retries.
 */
export async function POST(req: Request) {
  const raw = await req.text(); // untouched — signature is computed over the exact bytes
  const signature = req.headers.get("x-webhook-signature") ?? "";
  const timestamp = req.headers.get("x-webhook-timestamp") ?? "";
  if (!signature || !timestamp || !verifyWebhookSignature(raw, timestamp, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: { type?: string; event_time?: string; data?: Record<string, any> }; // eslint-disable-line @typescript-eslint/no-explicit-any
  try { event = JSON.parse(raw); } catch { return NextResponse.json({ error: "Bad payload" }, { status: 400 }); }

  const eventId = req.headers.get("x-idempotency-key") || createHash("sha256").update(raw).digest("hex");
  const eventMs = event.event_time ? Date.parse(event.event_time) || Date.now() : Date.now();
  const admin = createAdminClient();

  try {
    const { data: seen } = await admin.from("payment_events").select("processed_at").eq("id", eventId).maybeSingle();
    if (seen?.processed_at) return NextResponse.json({ ok: true, duplicate: true });
    if (!seen) await admin.from("payment_events").insert({ id: eventId, event: event.type ?? "unknown", payload: event });

    const d = event.data ?? {};
    switch (event.type) {
      case "SUBSCRIPTION_STATUS_CHANGED": {
        const s = d.subscription_details;
        if (s?.subscription_id && s?.subscription_status) await applyStatus(admin, s.subscription_id, s.subscription_status, eventMs);
        break;
      }
      case "SUBSCRIPTION_PAYMENT_SUCCESS": {
        if (d.subscription_id && d.payment_status === "SUCCESS") {
          const key = d.payment_type === "AUTH" ? `auth:${d.subscription_id}` : `charge:${d.cf_payment_id}`;
          await recordPayment(admin, d.subscription_id, key, Number(d.payment_amount));
        }
        break;
      }
      case "SUBSCRIPTION_PAYMENT_FAILED": {
        // A failed AUTH just means checkout failed; only a failed renewal puts a member past due
        if (d.subscription_id && d.payment_type === "CHARGE") await applyStatus(admin, d.subscription_id, "ON_HOLD", eventMs);
        break;
      }
      default: break; // events we don't act on are acknowledged so they aren't retried
    }

    await admin.from("payment_events").update({ processed_at: new Date().toISOString() }).eq("id", eventId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[cashfree-webhook]", event.type, e);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
