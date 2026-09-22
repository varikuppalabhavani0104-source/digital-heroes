import CreateDrawForm from "@/components/admin/CreateDrawForm";
import PublishDrawButton from "@/components/admin/PublishDrawButton";
import SimulateDrawButton from "@/components/admin/SimulateDrawButton";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function createDraw(
  _prevState: string,
  formData: FormData
): Promise<string> {
  "use server";

  const supabase = createClient();

  const month = String(formData.get("draw_month") || "");
  const drawType = String(formData.get("draw_type") || "random");

  if (!month) {
    return "Please select a draw month.";
  }

  const drawMonth = `${month}-01`;

  const { error } = await supabase.from("draws").insert({
    draw_month: drawMonth,
    draw_type: drawType,
    status: "draft",
  });

  if (error) {
    console.error("[admin/draws] Failed to create draw:", error);

    if (error.code === "23505") {
      return "A draw for this month already exists.";
    }

    return error.message;
  }

  revalidatePath("/admin/draws");

  return "";
}

export default async function DrawsPage() {
  const supabase = createClient();

  const { data: draws, error } = await supabase
    .from("draws")
    .select(
      "id, draw_month, draw_type, status, active_subscribers, prize_pool_paise, jackpot_carry_paise, pool_5_paise, pool_4_paise, pool_3_paise, jackpot_rolled_over, winning_numbers, published_at"
    )
    .order("draw_month", { ascending: false });

  if (error) {
    console.error("[admin/draws] Failed to load draws:", error);

    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold">Draws</h1>
        <p className="mt-2 text-red-600">
          Couldn&apos;t load draws: {error.message}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Draws</h1>
          <p className="mt-1 text-sm text-ink-500">
            Manage monthly draws, prize pools and results.
          </p>
        </div>

        <details className="rounded-2xl border border-ink-100 bg-white shadow-sm">
          <summary className="cursor-pointer list-none px-5 py-3 font-semibold">
            + Create Monthly Draw
          </summary>

          <CreateDrawForm createDraw={createDraw} />
        </details>
      </div>

      {draws && draws.length > 0 ? (
        <div className="space-y-4">
          {draws.map((draw) => (
            <div
              key={draw.id}
              className="rounded-2xl border border-ink-100 bg-white p-6 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">
                    {new Date(draw.draw_month).toLocaleDateString("en-IN", {
                      month: "long",
                      year: "numeric",
                    })}
                  </h2>

                  <p className="mt-1 text-sm text-ink-500">
                    {draw.draw_type === "random"
                      ? "Random draw"
                      : "Algorithmic draw"}
                  </p>
                </div>

                <span className="rounded-full bg-ink-100 px-3 py-1 text-sm font-medium capitalize">
                  {draw.status}
                </span>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-xs text-ink-500">
                    Active subscribers
                  </p>
                  <p className="mt-1 text-xl font-semibold">
                    {draw.active_subscribers}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-ink-500">Prize pool</p>
                  <p className="mt-1 text-xl font-semibold">
                    ₹
                    {((draw.prize_pool_paise ?? 0) / 100).toLocaleString(
                      "en-IN"
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-ink-500">5-match pool</p>
                  <p className="mt-1 text-xl font-semibold">
                    ₹
                    {((draw.pool_5_paise ?? 0) / 100).toLocaleString("en-IN")}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-ink-500">Jackpot carry</p>
                  <p className="mt-1 text-xl font-semibold">
                    ₹
                    {((draw.jackpot_carry_paise ?? 0) / 100).toLocaleString(
                      "en-IN"
                    )}
                  </p>
                </div>
              </div>

              {draw.winning_numbers?.length ? (
                <div className="mt-6">
                  <p className="text-xs text-ink-500">Winning numbers</p>

                  <div className="mt-2 flex flex-wrap gap-2">
                    {draw.winning_numbers.map((number: number) => (
                      <span
                        key={number}
                        className="flex h-9 w-9 items-center justify-center rounded-full bg-lagoon-100 font-semibold text-lagoon-700"
                      >
                        {number}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="mt-6 text-sm text-ink-500">
                  No winning numbers published yet.
                </p>
              )}

              {draw.status === "draft" && (
                <SimulateDrawButton drawId={draw.id} />
              )}

              {draw.status === "simulated" && (
                <PublishDrawButton drawId={draw.id} />
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-10 text-center">
          <h2 className="text-lg font-semibold">No draws yet</h2>
          <p className="mt-2 text-sm text-ink-500">
            Create the first monthly draw to get started.
          </p>
        </div>
      )}
    </div>
  );
}