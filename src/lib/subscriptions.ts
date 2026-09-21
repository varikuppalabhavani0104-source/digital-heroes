import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { mapStatus } from "./cashfree";

/** Keep in sync with has_active_subscription() in 002_billing.sql */
export const GRACE_MS = 2 * 24 * 60 * 60 * 1000;

/**
 * Writes a provider status into our DB. Used by the webhook (source of truth) and by the
 * post-checkout return route. Idempotent, order-safe, and never moves a paid member backwards.
 */
export async function applyStatus(admin: SupabaseClient, providerSubId: string, cfStatus: string, eventTimeMs: number) {
  const { data: row } = await admin.from("subscriptions")
    .select("id, user_id, status, current_period_end, cancel_at_period_end, last_event_at")
    .eq("provider_subscription_id", providerSubId).maybeSingle();
  if (!row) return null; // not one of ours

  if (row.last_event_at && eventTimeMs < new Date(row.last_event_at).getTime()) return row; // stale event

  let status = mapStatus(cfStatus);
  let cancelFlag: boolean = row.cancel_at_period_end;
  const paidThrough = row.current_period_end ? new Date(row.current_period_end).getTime() : 0;

  // Cancelled at the provider but already paid through a future date → keep access until then
  if (status === "cancelled" && paidThrough > Date.now()) { status = "active"; cancelFlag = true; }
  // 'active' only ever comes from a verified payment (which sets the paid-through date)
  if (status === "active" && !row.current_period_end) status = row.status;
  // Never regress (e.g. a late INITIALIZED after ACTIVE)
  if (status === "incomplete" && row.status !== "incomplete") status = row.status;

  const { error } = await admin.from("subscriptions").update({
    status, cancel_at_period_end: cancelFlag,
    last_event_at: new Date(eventTimeMs).toISOString(), updated_at: new Date().toISOString(),
  }).eq("id", row.id);
  if (error) throw error;
  return row;
}

/**
 * Records one successful payment: charity ledger + paid-through extension + active status,
 * atomically, in Postgres. `paymentKey` makes replays harmless:
 *   first payment → `auth:<subscription_id>`   renewals → `charge:<cf_payment_id>`
 */
export async function recordPayment(admin: SupabaseClient, providerSubId: string, paymentKey: string, amountRupees: number) {
  const { data, error } = await admin.rpc("record_subscription_payment", {
    p_provider_sub_id: providerSubId, p_payment_key: paymentKey, p_amount_paise: Math.round(amountRupees * 100),
  });
  if (error) throw error;
  return data === true;
}

type SubRow = { status: string; current_period_end: string | null; cancel_at_period_end: boolean; plan: string; amount_paise: number };

/** What the UI should show (mirrors the database's time-based access rule). */
export function effectiveStatus(sub: SubRow | null): "inactive" | "active" | "past_due" | "cancelled" | "expired" {
  if (!sub || sub.status === "incomplete") return "inactive";
  if (sub.status === "active" && sub.current_period_end && new Date(sub.current_period_end).getTime() + GRACE_MS < Date.now()) {
    return sub.cancel_at_period_end ? "cancelled" : "expired";
  }
  return sub.status as "active" | "past_due" | "cancelled" | "expired";
}

/** Latest meaningful subscription for a user (ignores abandoned checkouts). */
export async function getCurrentSubscription(supabase: SupabaseClient, userId: string): Promise<SubRow | null> {
  const { data } = await supabase
    .from("subscriptions")
    .select("plan,status,current_period_end,cancel_at_period_end,amount_paise")
    .eq("user_id", userId).neq("status", "incomplete")
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  return data ?? null;
}

/** Real-time entitlement check — the same function the database RLS policies use. */
export async function hasActiveSubscription(supabase: SupabaseClient): Promise<boolean> {
  const { data } = await supabase.rpc("has_active_subscription");
  return data === true;
}
