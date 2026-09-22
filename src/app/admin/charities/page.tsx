import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function createCharity(formData: FormData) {
  "use server";

  const supabase = createClient();

  const name = String(formData.get("name") || "").trim();
  const slug = String(formData.get("slug") || "").trim();
  const category = String(formData.get("category") || "").trim();
  const shortDesc = String(formData.get("short_desc") || "").trim();

  // Validation
  if (!name || !slug || !category || !shortDesc) {
    redirect(
      "/admin/charities?error=" +
        encodeURIComponent("Please fill in all fields.")
    );
  }

  const { error } = await supabase.from("charities").insert({
    name,
    slug,
    category,
    short_desc: shortDesc,
  });

  if (error) {
    if (error.code === "23505") {
      redirect(
        "/admin/charities?error=" +
          encodeURIComponent("A charity with this slug already exists.")
      );
    }

    redirect(
      "/admin/charities?error=" +
        encodeURIComponent(error.message)
    );
  }

  revalidatePath("/admin/charities");
  revalidatePath("/charities");

  redirect(
    "/admin/charities?success=" +
      encodeURIComponent("Charity added successfully.")
  );
}

export default async function CharitiesPage({
  searchParams,
}: {
  searchParams: { error?: string; success?: string };
}) {
  const supabase = createClient();

  const { data: charities, error } = await supabase
    .from("charities")
    .select("id, name, slug, category, short_desc")
    .order("name", { ascending: true });

  // Actual database loading error
  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Charities</h1>

        <p className="rounded-xl bg-red-50 p-4 text-sm text-red-600">
          Couldn&apos;t load charities: {error.message}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Charities</h1>
        <p className="mt-1 text-sm text-ink-500">
          Manage the charities available to subscribers.
        </p>
      </div>

      {/* Error message */}
      {searchParams.error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
        >
          {searchParams.error}
        </div>
      )}

      {/* Success message */}
      {searchParams.success && (
        <div
          role="status"
          className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700"
        >
          {searchParams.success}
        </div>
      )}

      {/* Create charity */}
      <details
        className="rounded-2xl border border-ink-100 bg-white shadow-sm"
        open={!!searchParams.error}
      >
        <summary className="cursor-pointer list-none px-5 py-4 font-semibold">
          + Add Charity
        </summary>

        <form
          action={createCharity}
          className="space-y-4 border-t border-ink-100 p-5"
        >
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium"
            >
              Charity name
            </label>

            <input
              id="name"
              name="name"
              type="text"
              required
              className="mt-1 w-full rounded-xl border border-ink-200 px-3 py-2"
              placeholder="Example Charity"
            />
          </div>

          <div>
            <label
              htmlFor="slug"
              className="block text-sm font-medium"
            >
              Slug
            </label>

            <input
              id="slug"
              name="slug"
              type="text"
              required
              className="mt-1 w-full rounded-xl border border-ink-200 px-3 py-2"
              placeholder="example-charity"
            />
          </div>

          <div>
            <label
              htmlFor="category"
              className="block text-sm font-medium"
            >
              Category
            </label>

            <input
              id="category"
              name="category"
              type="text"
              required
              className="mt-1 w-full rounded-xl border border-ink-200 px-3 py-2"
              placeholder="Education"
            />
          </div>

          <div>
            <label
              htmlFor="short_desc"
              className="block text-sm font-medium"
            >
              Short description
            </label>

            <textarea
              id="short_desc"
              name="short_desc"
              required
              rows={3}
              className="mt-1 w-full rounded-xl border border-ink-200 px-3 py-2"
              placeholder="Briefly describe what this charity does."
            />
          </div>

          <button
            type="submit"
            className="rounded-xl bg-[#17194f] px-4 py-2.5 font-semibold text-white hover:bg-[#25286b]"
          >
            Add Charity
          </button>
        </form>
      </details>

      {/* Charity list */}
      {charities && charities.length > 0 ? (
        <div className="space-y-4">
          {charities.map((charity) => (
            <div
              key={charity.id}
              className="rounded-2xl border border-ink-100 bg-white p-6 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">
                    {charity.name}
                  </h2>

                  <p className="mt-1 text-sm text-lagoon-700">
                    {charity.category}
                  </p>
                </div>

                <span className="rounded-full bg-ink-100 px-3 py-1 text-xs font-medium">
                  {charity.slug}
                </span>
              </div>

              <p className="mt-4 text-sm text-ink-500">
                {charity.short_desc}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-10 text-center">
          <h2 className="text-lg font-semibold">No charities yet</h2>
          <p className="mt-2 text-sm text-ink-500">
            Add the first charity above.
          </p>
        </div>
      )}
    </div>
  );
}