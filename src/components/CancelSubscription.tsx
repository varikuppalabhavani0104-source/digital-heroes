"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";

/** Cancelling is destructive-ish, so it asks first and says exactly what will happen. */
export function CancelSubscription({ endsOn }: { endsOn: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function cancel() {
    setLoading(true);
    const res = await fetch("/api/subscription/cancel", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) return toast.error(data.error ?? "We couldn't cancel right now. Please try again.");
    toast.success("Subscription cancelled ✓");
    setConfirming(false);
    router.refresh();
  }

  if (!confirming) {
    return <button onClick={() => setConfirming(true)} className="text-sm font-medium text-ink-500 underline-offset-4 hover:text-danger hover:underline">Cancel subscription</button>;
  }
  return (
    <div role="alertdialog" aria-label="Confirm cancellation" className="mt-1 rounded-xl border border-danger/30 bg-danger-100/50 p-4">
      <p className="text-sm font-semibold">Cancel your subscription?</p>
      <p className="mt-1 text-sm text-ink-700">You&apos;ll keep full access until {endsOn} and you won&apos;t be charged again. After that you&apos;ll leave the monthly draw and your charity contributions stop.</p>
      <div className="mt-3 flex gap-2">
        <Button variant="secondary" onClick={() => setConfirming(false)} className="!py-2">Keep subscription</Button>
        <Button variant="danger" loading={loading} onClick={cancel} className="!py-2">Yes, cancel</Button>
      </div>
    </div>
  );
}
