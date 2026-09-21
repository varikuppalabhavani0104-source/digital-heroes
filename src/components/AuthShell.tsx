import { Logo } from "./Logo";
import type { ReactNode } from "react";

/** Shared split layout for login / signup. Charity-first message on the brand panel. */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[1fr_1.1fr]">
      <aside className="relative hidden overflow-hidden bg-ink p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <Logo light />
        <div className="relative z-10">
          <p className="font-display text-4xl font-bold leading-tight">Every round you play<br />can change someone&apos;s week.</p>
          <p className="mt-4 max-w-sm text-ink-300">Track your scores, back a cause you care about, and enter a monthly prize draw — all from one place.</p>
        </div>
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-lagoon/30 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-28 -left-16 h-80 w-80 rounded-full bg-sun/20 blur-3xl" />
        <p className="relative z-10 text-sm text-ink-300">A minimum of 10% of every subscription goes to your chosen charity.</p>
      </aside>
      <section className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="w-full max-w-md animate-rise">
          <div className="mb-8 lg:hidden"><Logo /></div>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="mt-2 text-ink-500">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </section>
    </main>
  );
}
