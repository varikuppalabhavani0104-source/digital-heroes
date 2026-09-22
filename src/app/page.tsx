import { SiteHeader } from "@/components/SiteHeader";
import { LinkButton } from "@/components/ui/Button";

export default function Home() {
  return (
    <>
      <SiteHeader />

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-4 pb-24 pt-16 sm:px-6 sm:pt-24">
          <p className="inline-block rounded-full bg-lagoon-100 px-3 py-1 text-sm font-medium text-lagoon-700">
            Monthly draw · Charity first
          </p>

          <h1 className="mt-6 max-w-3xl text-5xl font-bold leading-[1.05] sm:text-7xl">
            Play better. Give back. Win something extraordinary.
          </h1>

          <p className="mt-6 max-w-xl text-lg text-ink-500">
            Log your Stableford scores, direct part of your subscription to a
            charity you believe in, and enter a monthly prize draw.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <LinkButton
              href="/signup"
              variant="giving"
              className="px-7 py-4 text-base"
            >
              Start giving
            </LinkButton>

            <LinkButton
              href="/login"
              variant="secondary"
              className="px-7 py-4 text-base"
            >
              Sign in
            </LinkButton>
          </div>
        </section>

        {/* How it works */}
        <section
          id="how"
          className="border-y border-ink-100 bg-white"
        >
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
            <h2 className="text-3xl font-bold text-[#17194f]">
              How it works
            </h2>

            <p className="mt-2 max-w-2xl text-ink-500">
              A simple way to play, give back, and take part in the monthly
              draw.
            </p>

            <div className="mt-10 grid gap-6 md:grid-cols-3">
              <div className="rounded-2xl border border-ink-100 p-6">
                <h3 className="text-lg font-semibold">1. Subscribe</h3>
                <p className="mt-2 text-sm leading-6 text-ink-500">
                  Choose a monthly or yearly plan and select a charity you
                  want to support.
                </p>
              </div>

              <div className="rounded-2xl border border-ink-100 p-6">
                <h3 className="text-lg font-semibold">2. Play & score</h3>
                <p className="mt-2 text-sm leading-6 text-ink-500">
                  Log your Stableford scores and build your monthly draw
                  entry.
                </p>
              </div>

              <div className="rounded-2xl border border-ink-100 p-6">
                <h3 className="text-lg font-semibold">3. Give & win</h3>
                <p className="mt-2 text-sm leading-6 text-ink-500">
                  Part of your subscription supports your chosen charity,
                  while eligible entries take part in the monthly draw.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}