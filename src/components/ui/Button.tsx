import { cn } from "@/lib/utils";
import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "giving" | "secondary" | "ghost" | "danger";
const styles: Record<Variant, string> = {
  primary: "bg-ink text-white hover:bg-ink-700 shadow-lift",
  giving: "bg-lagoon text-white hover:bg-lagoon-700 shadow-lift",
  secondary: "bg-white text-ink border border-ink-100 hover:border-ink-300",
  ghost: "text-ink-700 hover:bg-ink-100/60",
  danger: "bg-danger text-white hover:opacity-90",
};
const base =
  "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition active:scale-[.98] disabled:pointer-events-none disabled:opacity-60";

export function Spinner({ className }: { className?: string }) {
  return <span aria-hidden className={cn("h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent", className)} />;
}

export function Button({
  variant = "primary", loading, className, children, disabled, ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean; children: ReactNode }) {
  return (
    <button className={cn(base, styles[variant], className)} disabled={disabled || loading} aria-busy={loading} {...rest}>
      {loading && <Spinner />}
      {children}
    </button>
  );
}

export function LinkButton({
  href, variant = "primary", className, children,
}: { href: string; variant?: Variant; className?: string; children: ReactNode }) {
  return <Link href={href} className={cn(base, styles[variant], className)}>{children}</Link>;
}
