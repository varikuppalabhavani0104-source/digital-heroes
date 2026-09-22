import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CharityPage({
  params,
}: {
  params: { slug: string };
}) {
  const supabase = createClient();

  const { data: charity, error } = await supabase
    .from("charities")
    .select("id, name, slug, category, short_desc")
    .eq("slug", params.slug)
    .single();

  if (error || !charity) {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-3xl font-bold text-red-600">
        Charity not found
      </h1>

      <p className="mt-4 text-sm text-ink-500">
        Slug received: {params.slug}
      </p>

      <p className="mt-2 text-sm text-red-600">
        Error: {error?.message || "No charity returned"}
      </p>

      <Link
        href="/charities"
        className="mt-6 inline-block font-semibold text-[#17194f]"
      >
        ← Back to charities
      </Link>
    </main>
  );
}

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <Link
        href="/charities"
        className="text-sm font-medium text-ink-500 hover:text-ink"
      >
        ← Back to charities
      </Link>

      <section className="mt-6 rounded-3xl border border-ink-100 bg-white p-8 shadow-sm">
        <span className="inline-flex rounded-full bg-ink-100 px-3 py-1 text-xs font-medium">
          {charity.category}
        </span>

        <h1 className="mt-4 text-4xl font-bold text-[#17194f]">
          {charity.name}
        </h1>

        <p className="mt-5 text-lg leading-8 text-ink-500">
          {charity.short_desc}
        </p>

        <div className="mt-8 rounded-2xl bg-lagoon-50 p-5">
          <p className="font-semibold text-ink">
            Your subscription can support this cause.
          </p>

          <p className="mt-1 text-sm text-ink-500">
            Choose this charity when you subscribe and a portion of your
            subscription will go towards supporting it.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/pricing"
            className="rounded-xl bg-[#17194f] px-5 py-3 font-semibold text-white hover:bg-[#25286b]"
          >
            Subscribe & Support
          </Link>

          <Link
            href="/charities"
            className="rounded-xl border border-ink-200 px-5 py-3 font-semibold text-ink-700 hover:bg-ink-50"
          >
            View Other Causes
          </Link>
        </div>
      </section>
    </main>
  );
}