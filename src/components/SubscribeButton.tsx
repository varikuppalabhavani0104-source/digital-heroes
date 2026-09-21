"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";

type CashfreeSdk = { subscriptionsCheckout: (o: { subsSessionId: string; redirectTarget?: string }) => Promise<{ error?: { message: string } } | void> };
declare global { interface Window { Cashfree?: (o: { mode: string }) => CashfreeSdk } }

function loadSdk(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Cashfree) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

const PHONE_RE = /^[6-9]\d{9}$/;

/**
 * Flow: POST /api/subscribe (server creates the Cashfree subscription)
 *    → Cashfree hosted checkout (authorise UPI/card mandate + pay first cycle)
 *    → Cashfree sends the browser to /api/subscribe/return → server asks Cashfree for the real
 *      status → /dashboard. The database only says "active" after the SERVER has confirmed it.
 */
export function SubscribeButton({
  plan, variant = "primary", children, phone: knownPhone,
}: { plan: "monthly" | "yearly"; variant?: "primary" | "giving" | "secondary"; children: React.ReactNode; phone?: string | null }) {
  const [loading, setLoading] = useState(false);
  const [askPhone, setAskPhone] = useState(false);
  const [phone, setPhone] = useState(knownPhone ?? "");
  const [phoneErr, setPhoneErr] = useState("");

  async function start() {
    // UPI/card mandates legally need a mobile number — ask once, remember it
    if (!PHONE_RE.test(phone)) {
      setAskPhone(true);
      if (phone) setPhoneErr("Enter a valid 10-digit Indian mobile number.");
      return;
    }
    setPhoneErr("");
    setLoading(true);
    try {
      if (!(await loadSdk())) throw new Error("We couldn't load the payment window. Check your connection and try again.");
      const res = await fetch("/api/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ plan, phone }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "We couldn't start checkout. Please try again.");

      const cashfree = window.Cashfree!({ mode: data.mode });
      const result = await cashfree.subscriptionsCheckout({ subsSessionId: data.sessionId, redirectTarget: "_self" });
      if (result && result.error) throw new Error(result.error.message);
      // On success the browser navigates away to Cashfree; nothing more to do here.
    } catch (err) {
      setLoading(false);
      toast.error(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <div className="space-y-3">
      {askPhone && (
        <div>
          <label htmlFor={`phone-${plan}`} className="mb-1.5 block text-sm font-medium text-current">Mobile number for your payment mandate</label>
          <input
            id={`phone-${plan}`} inputMode="numeric" autoComplete="tel-national" maxLength={10} placeholder="10-digit mobile number"
            value={phone} onChange={(e) => { setPhone(e.target.value.replace(/\D/g, "")); setPhoneErr(""); }}
            aria-invalid={!!phoneErr} className="input !text-ink"
          />
          {phoneErr && <p role="alert" className="mt-1.5 text-sm text-danger">{phoneErr}</p>}
        </div>
      )}
      <Button variant={variant} loading={loading} onClick={start} className="w-full py-3.5 text-base">{askPhone ? "Continue to payment" : children}</Button>
    </div>
  );
}
