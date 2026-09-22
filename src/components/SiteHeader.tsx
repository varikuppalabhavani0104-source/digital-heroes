import Link from "next/link";
import { Logo } from "./Logo";
import { LinkButton } from "./ui/Button";
import { createClient } from "@/lib/supabase/server";

/** Public header. Shows Sign in vs Dashboard based on the real session. */
export async function SiteHeader() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return (
    <header className="sticky top-0 z-40 border-b border-ink-100/70 bg-fog/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-7 text-sm font-medium text-ink-700 md:flex">
          <Link href="/#how" className="hover:text-ink">How it works</Link>
          <Link href="/charities" className="hover:text-ink">Charities</Link>
          <Link href="/pricing" className="hover:text-ink">Pricing</Link>
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <LinkButton href="/dashboard" variant="primary">Dashboard</LinkButton>
          ) : (
            <>
              <LinkButton href="/login" variant="ghost" className="hidden sm:inline-flex">Sign in</LinkButton>
              <LinkButton href="/pricing" variant="giving">Subscribe</LinkButton>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
