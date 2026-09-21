import { SiteHeader } from "@/components/SiteHeader";
import { LinkButton } from "@/components/ui/Button";

/** Starter landing page — the full charity-first landing is built in the polish step. */
export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-16 sm:px-6 sm:pt-24">
        <p className="inline-block rounded-full bg-lagoon-100 px-3 py-1 text-sm font-medium text-lagoon-700">Monthly draw · Charity first</p>
        <h1 className="mt-6 max-w-3xl text-5xl font-bold leading-[1.05] sm:text-7xl">Play better. Give back. Win something extraordinary.</h1>
        <p className="mt-6 max-w-xl text-lg text-ink-500">
          Log your Stableford scores, direct part of your subscription to a charity you believe in, and enter a monthly prize draw.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <LinkButton href="/signup" variant="giving" className="px-7 py-4 text-base">Start giving</LinkButton>
          <LinkButton href="/login" variant="secondary" className="px-7 py-4 text-base">Sign in</LinkButton>
        </div>
      </main>
    </>
  );
}
