"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { cn, formatINR } from "@/lib/utils";

type Charity = { id: string; name: string; category: string; short_desc: string };

const schema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name."),
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Use at least 8 characters."),
});

export function SignupForm({ charities, monthlyPaise, minPercent }: { charities: Charity[]; monthlyPaise: number; minPercent: number }) {
  const router = useRouter();
  const [charityId, setCharityId] = useState(charities[0]?.id ?? "");
  const [percent, setPercent] = useState(minPercent);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError("");
    const parsed = schema.safeParse(Object.fromEntries(new FormData(e.currentTarget)));
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [i.path[0] as string, i.message])));
      return;
    }
    setErrors({});
    setLoading(true);
    const { data, error } = await createClient().auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: { full_name: parsed.data.full_name, charity_id: charityId, charity_percent: percent },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);
    if (error) {
      setFormError(
        /registered|exists/i.test(error.message)
          ? "An account with this email already exists. Try signing in instead."
          : error.message
      );
      return;
    }
    if (!data.session) {
      // Email confirmation is ON in Supabase: no session until the link is clicked.
      toast.success("Check your inbox to confirm your email, then sign in.");
      router.push("/login");
      return;
    }
    toast.success("Welcome aboard! Now choose your plan ✓");
    router.push("/pricing");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <Field id="full_name" label="Full name" autoComplete="name" error={errors.full_name} />
      <Field id="email" label="Email" type="email" autoComplete="email" error={errors.email} />
      <Field id="password" label="Password" type="password" autoComplete="new-password" hint="At least 8 characters." error={errors.password} />

      <fieldset>
        <legend className="label">Choose your cause</legend>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {charities.map((c) => (
            <label key={c.id} className={cn(
              "cursor-pointer rounded-xl border bg-white p-3.5 transition hover:border-lagoon has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-lagoon",
              charityId === c.id ? "border-lagoon bg-lagoon-50 ring-1 ring-lagoon" : "border-ink-100"
            )}>
              <input type="radio" name="charity" value={c.id} checked={charityId === c.id} onChange={() => setCharityId(c.id)} className="sr-only" />
              <span className="block text-xs font-medium text-lagoon-700">{c.category}</span>
              <span className="mt-0.5 block text-sm font-semibold leading-snug">{c.name}</span>
              <span className="mt-1 block text-xs text-ink-500">{c.short_desc}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <div className="flex items-baseline justify-between">
          <label htmlFor="pct" className="label !mb-0">Share of your subscription to charity</label>
          <span className="font-display text-lg font-bold text-lagoon-700">{percent}%</span>
        </div>
        <input id="pct" type="range" min={minPercent} max={50} step={5} value={percent}
          onChange={(e) => setPercent(Number(e.target.value))} className="mt-3 w-full accent-[#0E9F8E]" />
        <p className="mt-1.5 text-xs text-ink-500">
          That&apos;s {formatINR((monthlyPaise * percent) / 100)} of a {formatINR(monthlyPaise)} monthly plan. The minimum is {minPercent}%.
        </p>
      </div>

      {formError && <p role="alert" className="rounded-xl bg-danger-100 px-4 py-3 text-sm text-danger">{formError}</p>}
      <Button type="submit" loading={loading} variant="giving" className="w-full">Create account</Button>
      <p className="text-center text-sm text-ink-500">
        Already a member? <Link href="/login" className="font-semibold text-lagoon-700 hover:underline">Sign in</Link>
      </p>
    </form>
  );
}
