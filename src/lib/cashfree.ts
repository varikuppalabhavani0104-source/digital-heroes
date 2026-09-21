import "server-only";
import crypto from "node:crypto";

/**
 * Minimal Cashfree Subscriptions client (plain fetch — no SDK to install).
 * SERVER ONLY: uses the secret key. Never import from a client component.
 * Docs: https://www.cashfree.com/docs/payments/subscription/hosted-checkout
 */
export type PlanKey = "monthly" | "yearly";
export type SubscriptionStatus = "incomplete" | "active" | "past_due" | "cancelled" | "expired";

const API_VERSION = "2025-01-01";
/** Strip quotes / trailing "# comment" / spaces that sneak into .env values. */
const clean = (v?: string) => (v ?? "").split(/\s+#/)[0].trim().replace(/^["']|["']$/g, "").trim();

export const cashfreeEnv = () => ({
  appId: clean(process.env.CASHFREE_APP_ID),
  secret: clean(process.env.CASHFREE_SECRET_KEY),
  mode: clean(process.env.CASHFREE_ENV) === "production" ? ("production" as const) : ("sandbox" as const),
});

export type CfAuthDetails = { authorization_amount?: number; authorization_status?: string };
export type CfSubscription = {
  subscription_id: string;
  cf_subscription_id?: string;
  subscription_status: string;
  subscription_session_id?: string;
  authorisation_details?: CfAuthDetails; // (sic) — the API spells it this way
  authorization_details?: CfAuthDetails;
};

export class CashfreeError extends Error {
  constructor(message: string, public status = 500) { super(message); }
}

async function cf<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const { appId, secret, mode } = cashfreeEnv();
  if (!appId || !secret) throw new CashfreeError("Payments are not configured yet.", 500);
  const base = mode === "production" ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg";
  const res = await fetch(`${base}${path}`, {
    method: init.method ?? (init.body ? "POST" : "GET"),
    headers: { "x-client-id": appId, "x-client-secret": secret, "x-api-version": API_VERSION, "Content-Type": "application/json" },
    body: init.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new CashfreeError(json?.message ?? "The payment provider rejected the request.", res.status);
  return json as T;
}

export const fetchSubscription = (id: string) => cf<CfSubscription>(`/subscriptions/${encodeURIComponent(id)}`);

/** Cancels future debits. (Members keep access locally until the period they paid for ends.) */
export const cancelSubscription = (id: string) =>
  cf<CfSubscription>(`/subscriptions/${encodeURIComponent(id)}/manage`, { method: "POST", body: { subscription_id: id, action: "CANCEL" } });

export function addCycle(from: Date, plan: PlanKey) {
  const d = new Date(from);
  if (plan === "monthly") d.setUTCMonth(d.getUTCMonth() + 1);
  else d.setUTCFullYear(d.getUTCFullYear() + 1);
  return d;
}
const iso = (d: Date) => d.toISOString().replace(/\.\d{3}Z$/, "Z");

/**
 * Creates a PERIODIC subscription with the plan defined inline.
 * The authorisation payment is a REAL charge of the first cycle (no refund), so the member
 * is paid up from day one; the automatic recurring debit starts one cycle later.
 */
export function createSubscription(a: {
  id: string; plan: PlanKey; amountRupees: number;
  name: string; email: string; phone: string; returnUrl: string;
}) {
  const now = new Date();
  const farFuture = new Date(now); farFuture.setUTCFullYear(now.getUTCFullYear() + 10);
  return cf<CfSubscription>("/subscriptions", {
    body: {
      subscription_id: a.id,
      customer_details: { customer_name: a.name, customer_email: a.email, customer_phone: a.phone },
      plan_details: {
        plan_name: `Digital Heroes ${a.plan === "monthly" ? "Monthly" : "Yearly"}`,
        plan_type: "PERIODIC",
        plan_amount: a.amountRupees,
        plan_max_amount: a.amountRupees,
        plan_max_cycles: a.plan === "monthly" ? 120 : 10,
        plan_intervals: 1,
        plan_interval_type: a.plan === "monthly" ? "MONTH" : "YEAR",
        plan_currency: "INR",
        plan_note: "Digital Heroes membership",
      },
      authorization_details: {
        authorization_amount: a.amountRupees,
        authorization_amount_refund: false,
        payment_methods: ["upi", "card"],
      },
      subscription_meta: { return_url: a.returnUrl },
      subscription_expiry_time: iso(farFuture),
      subscription_first_charge_time: iso(addCycle(now, a.plan)),
      subscription_tags: { psp_note: "Digital Heroes membership" },
    },
  });
}

/**
 * Webhook signature: Base64( HMAC_SHA256( timestamp + rawBody ) ).
 * Uses CASHFREE_WEBHOOK_SECRET if set, otherwise your API secret key.
 */
export function verifyWebhookSignature(rawBody: string, timestamp: string, signature: string) {
  const key = clean(process.env.CASHFREE_WEBHOOK_SECRET) || cashfreeEnv().secret;
  const expected = crypto.createHmac("sha256", key).update(timestamp + rawBody).digest("base64");
  const A = Buffer.from(expected), B = Buffer.from(signature);
  return A.length === B.length && crypto.timingSafeEqual(A, B);
}

/** Cashfree subscription status → our lifecycle enum. */
export function mapStatus(s: string): SubscriptionStatus {
  switch (s) {
    case "ACTIVE": return "active";
    case "ON_HOLD":                 // a renewal debit failed
    case "CUSTOMER_PAUSED":
    case "PAUSED": return "past_due";
    case "CANCELLED":
    case "CUSTOMER_CANCELLED": return "cancelled";
    case "COMPLETED":
    case "EXPIRED":
    case "CARD_EXPIRED": return "expired";
    default: return "incomplete";   // INITIALIZED | BANK_APPROVAL_PENDING | LINK_EXPIRED
  }
}
