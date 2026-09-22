import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CharitiesPage() {
  const supabase = createClient();

  const { data: charities, error } = await supabase
    .from("charities")
    .select("id, name, slug, category, short_desc")
    .order("name", { ascending: true });

  if (error) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="text-3xl font-bold">Our Causes</h1>

        <div className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">
          Couldn&apos;t load charities: {error.message}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <div>
        <h1 className="text-4xl font-bold text-[#17194f]">
          Choose a Cause
        </h1>

        <p className="mt-2 text-ink-500">
          Your subscription helps support a cause you care about.
        </p>
      </div>

      {charities && charities.length > 0 ? (
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {charities.map((charity) => (
            <Link
              key={charity.id}
              href={`/charities/${charity.slug}`}
              className="group rounded-2xl border border-ink-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-[#17194f] group-hover:text-[#25286b]">
                    {charity.name}
                  </h2>

                  <p className="mt-1 text-sm font-medium text-lagoon-700">
                    {charity.category}
                  </p>
                </div>

                <span className="rounded-full bg-ink-100 px-3 py-1 text-xs">
                  Cause
                </span>
              </div>

              <p className="mt-4 text-sm leading-6 text-ink-500">
                {charity.short_desc}
              </p>

              <p className="mt-5 text-sm font-semibold text-[#17194f]">
                Learn more →
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border border-dashed border-ink-200 bg-white p-10 text-center">
          <h2 className="text-lg font-semibold">
            No charities available
          </h2>

          <p className="mt-2 text-sm text-ink-500">
            Please check back later.
          </p>
        </div>
      )}
    </main>
  );
}