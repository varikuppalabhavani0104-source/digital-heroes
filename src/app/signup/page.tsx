import type { Metadata } from "next";
import { AuthShell } from "@/components/AuthShell";
import { createClient } from "@/lib/supabase/server";
import { SignupForm } from "./SignupForm";

export const metadata: Metadata = { title: "Create your account" };
export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const supabase = createClient();
  const [charitiesRes, settingsRes] = await Promise.all([
    supabase.from("charities").select("id,name,category,short_desc").eq("is_active", true).order("name"),
    supabase.from("app_settings").select("monthly_price_paise,min_charity_percent").single(),
  ]);

  // Surface failures instead of silently rendering an empty list
  if (charitiesRes.error) console.error("[signup] charities query failed:", charitiesRes.error);
  if (settingsRes.error) console.error("[signup] app_settings query failed:", settingsRes.error);
  console.log("[signup] charities returned:", charitiesRes.data?.length ?? "null (error)");

  return (
    <AuthShell title="Join Digital Heroes" subtitle="Create your account and choose the cause your subscription will support.">
      {charitiesRes.error && (
        <p role="alert" className="mb-5 rounded-xl bg-danger-100 px-4 py-3 text-sm text-danger">
          Couldn&apos;t load charities: {charitiesRes.error.message}
        </p>
      )}
      <SignupForm
        charities={charitiesRes.data ?? []}
        monthlyPaise={settingsRes.data?.monthly_price_paise ?? 49900}
        minPercent={settingsRes.data?.min_charity_percent ?? 10}
      />
    </AuthShell>
  );
}