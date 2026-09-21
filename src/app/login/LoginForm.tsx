"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";

const schema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

/** Only allow same-site relative redirects (prevents open-redirect abuse). */
const safeNext = (n: string | null) => (n && n.startsWith("/") && !n.startsWith("//") ? n : "/dashboard");

export function LoginForm() {
  const router = useRouter();
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
    const { error } = await createClient().auth.signInWithPassword(parsed.data);
    if (error) {
      setLoading(false);
      setFormError(
        error.message.toLowerCase().includes("invalid")
          ? "That email and password don't match. Check them and try again."
          : "We couldn't sign you in right now. Please try again in a moment."
      );
      return;
    }
    toast.success("Signed in ✓");
    router.push(safeNext(new URLSearchParams(window.location.search).get("next")));
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <Field id="email" label="Email" type="email" autoComplete="email" placeholder="you@example.com" error={errors.email} />
      <Field id="password" label="Password" type="password" autoComplete="current-password" error={errors.password} />
      {formError && <p role="alert" className="rounded-xl bg-danger-100 px-4 py-3 text-sm text-danger">{formError}</p>}
      <Button type="submit" loading={loading} className="w-full">Sign in</Button>
      <p className="text-center text-sm text-ink-500">
        New here? <Link href="/signup" className="font-semibold text-lagoon-700 hover:underline">Create an account</Link>
      </p>
    </form>
  );
}
