import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CancelSubscription } from "@/components/CancelSubscription";
import { LinkButton } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/server";
import {
  effectiveStatus,
  getCurrentSubscription,
  hasActiveSubscription,
} from "@/lib/subscriptions";
import { formatDate, formatINR } from "@/lib/utils";
import { revalidatePath } from "next/cache";

export const metadata: Metadata = { title: "Your dashboard" };
export const dynamic = "force-dynamic";

const BADGE: Record<string, string> = {
  active: "bg-lagoon-100 text-lagoon-700",
  past_due: "bg-sun-100 text-sun-700",
  cancelled: "bg-danger-100 text-danger",
  expired: "bg-danger-100 text-danger",
  inactive: "bg-ink-100 text-ink-700",
};

function dashboardMessage(message: string) {
  redirect(`/dashboard?score_message=${encodeURIComponent(message)}`);
}

async function addScore(formData: FormData) {
  "use server";

  const supabase = createClient();

  const score = Number(formData.get("score"));
  const playedOn = String(formData.get("played_on") || "");

  if (!score || score < 1 || score > 45) {
    dashboardMessage("Score must be between 1 and 45.");
  }

  if (!playedOn) {
    dashboardMessage("Please select the date you played.");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    dashboardMessage("Please sign in again.");
  }

  const { error } = await supabase.from("scores").insert({
    user_id: user!.id,
    score,
    played_on: playedOn,
  });

  if (error) {
    console.error("[dashboard] Failed to add score:", error);

    if (error.code === "23505") {
      dashboardMessage("You already have a score for this date.");
    }

    dashboardMessage(error.message);
  }

  revalidatePath("/dashboard");
  dashboardMessage("Score added successfully.");
}

async function updateScore(formData: FormData) {
  "use server";

  const supabase = createClient();

  const id = String(formData.get("id") || "");
  const score = Number(formData.get("score"));
  const playedOn = String(formData.get("played_on") || "");

  if (!id) {
    dashboardMessage("Invalid score.");
  }

  if (!score || score < 1 || score > 45) {
    dashboardMessage("Score must be between 1 and 45.");
  }

  if (!playedOn) {
    dashboardMessage("Please select the date you played.");
  }

  const { error } = await supabase
    .from("scores")
    .update({
      score,
      played_on: playedOn,
    })
    .eq("id", id);

  if (error) {
    console.error("[dashboard] Failed to update score:", error);

    if (error.code === "23505") {
      dashboardMessage("You already have a score for this date.");
    }

    dashboardMessage(error.message);
  }

  revalidatePath("/dashboard");
  dashboardMessage("Score updated successfully.");
}
async function submitWinnerProof(formData: FormData) {
  "use server";

  const supabase = createClient();

  const entryId = String(formData.get("draw_entry_id") || "");
  const proof = formData.get("proof") as File | null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    dashboardMessage("Please sign in again.");
  }

  if (!entryId || !proof || proof.size === 0) {
    dashboardMessage("Please upload your proof screenshot.");
  }

 if (!proof || !proof.type.startsWith("image/")) {
  dashboardMessage("Please upload an image file.");
  return;
}
    
  // Make sure this winning entry actually belongs to this user
  const { data: entry, error: entryError } = await supabase
    .from("draw_entries")
    .select("id, user_id, match_count")
    .eq("id", entryId)
    .eq("user_id", user!.id)
    .gte("match_count", 3)
    .single();

  if (entryError || !entry) {
    dashboardMessage("We couldn't verify this winning entry.");
  }

const extension = proof.name.split(".").pop() || "png";
  const path = `${user!.id}/${entryId}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("winner-proofs")
    .upload(path, proof, {
      contentType: proof.type,
      upsert: true,
    });

  if (uploadError) {
    console.error("[winner-proof] upload failed:", uploadError);
    dashboardMessage("Couldn't upload your proof. Please try again.");
  }

  const { error: verificationError } = await supabase
    .from("winner_verifications")
    .upsert({
      draw_entry_id: entryId,
      user_id: user!.id,
      match_count: entry!.match_count,
      proof_path: path,
      verification_status: "pending",
      payout_status: "pending",
    });

  if (verificationError) {
    console.error("[winner-proof] database error:", verificationError);
    dashboardMessage("Couldn't submit your proof. Please try again.");
  }

  revalidatePath("/dashboard");
  dashboardMessage("Proof submitted successfully. An admin will verify your win.");
}
async function deleteScore(formData: FormData) {
  "use server";

  const supabase = createClient();

  const id = String(formData.get("id") || "");

  if (!id) {
    dashboardMessage("Invalid score.");
  }

  const { error } = await supabase
    .from("scores")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[dashboard] Failed to delete score:", error);
    dashboardMessage(error.message);
  }

  revalidatePath("/dashboard");
  dashboardMessage("Score deleted.");
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: {
    subscribed?: string;
    score_message?: string;
  };
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, sub, entitled] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, charity_percent, charities(name, category)")
      .eq("id", user!.id)
      .single(),

    getCurrentSubscription(supabase, user!.id),

    hasActiveSubscription(supabase),
  ]);

  const { data: scores } = entitled
    ? await supabase
        .from("scores")
        .select("id, score, played_on")
        .eq("user_id", user!.id)
        .order("played_on", { ascending: false })
        .limit(5)
    : { data: [] };
    const { data: winningEntry } = entitled
  ? await supabase
      .from("draw_entries")
      .select(`
        id,
        match_count,
        draws!inner (
          draw_month,
          status,
          winning_numbers,
          pool_5_paise,
          pool_4_paise,
          pool_3_paise
        )
      `)
      .eq("user_id", user!.id)
      .gte("match_count", 3)
      .eq("draws.status", "published")
      .order("match_count", { ascending: false })
      .limit(1)
      .maybeSingle()
  : { data: null };
  const { data: existingVerification } = winningEntry
  ? await supabase
      .from("winner_verifications")
      .select("verification_status, payout_status")
      .eq("draw_entry_id", winningEntry.id)
      .maybeSingle()
  : { data: null };

  const charity = profile?.charities as unknown as {
    name: string;
    category: string;
  } | null;

  const status = effectiveStatus(sub);
  const firstName = profile?.full_name?.split(" ")[0] || "there";
  const endDate = sub?.current_period_end
    ? formatDate(sub.current_period_end)
    : "";

  return (
    <div className="animate-rise space-y-6">
      {searchParams.subscribed === "1" && entitled && (
        <p
          role="status"
          className="rounded-xl bg-lagoon-100 px-4 py-3 text-sm font-medium text-lagoon-700"
        >
          🎉 You&apos;re in! Your subscription is active and your charity is
          already benefiting.
        </p>
      )}

      {searchParams.subscribed === "pending" && !entitled && (
        <p
          role="status"
          className="rounded-xl bg-sun-100 px-4 py-3 text-sm font-medium text-sun-700"
        >
          Payment received — we&apos;re activating your subscription. Refresh
          in a few seconds.
        </p>
      )}

      {searchParams.score_message && (
        <p
          role="status"
          className="rounded-xl bg-lagoon-100 px-4 py-3 text-sm font-medium text-lagoon-700"
        >
          {searchParams.score_message}
        </p>
      )}

      <div>
        <h1 className="text-3xl font-bold">Hi {firstName} 👋</h1>
        <p className="mt-1 text-ink-500">
          Here&apos;s where you stand this month.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <section className="card p-6" aria-labelledby="sub-h">
          <h2
            id="sub-h"
            className="text-sm font-medium text-ink-500"
          >
            Subscription
          </h2>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span
              className={`rounded-full px-3 py-1 text-sm font-semibold capitalize ${
                BADGE[status]
              }`}
            >
              {status.replace("_", " ")}
            </span>

            {sub && (
              <span className="text-sm capitalize text-ink-500">
                {sub.plan} · {formatINR(sub.amount_paise)}
              </span>
            )}
          </div>

          <div className="mt-4 space-y-3 text-sm text-ink-500">
            {status === "inactive" && (
              <>
                <p>
                  Subscribe to unlock score entry and the monthly draw.
                </p>
                <LinkButton href="/pricing" variant="giving">
                  Choose a plan
                </LinkButton>
              </>
            )}

            {status === "active" && !sub?.cancel_at_period_end && (
              <>
                <p>
                  Renews on{" "}
                  <strong className="text-ink">{endDate}</strong>.
                </p>
                <CancelSubscription endsOn={endDate} />
              </>
            )}

            {status === "active" && sub?.cancel_at_period_end && (
              <p>
                Cancelled. You keep full access until{" "}
                <strong className="text-ink">{endDate}</strong>.
              </p>
            )}

            {status === "past_due" && (
              <p className="rounded-xl bg-sun-100 p-3 text-sun-700">
                Your last renewal payment didn&apos;t go through. We&apos;re
                retrying automatically — draw entry and score changes are
                paused until it succeeds.
              </p>
            )}

            {(status === "cancelled" || status === "expired") && (
              <>
                <p>
                  Your subscription ended
                  {endDate ? ` on ${endDate}` : ""}. Resubscribe to rejoin the
                  draw.
                </p>
                <LinkButton href="/pricing" variant="giving">
                  Resubscribe
                </LinkButton>
              </>
            )}
          </div>
        </section>

        <section className="card p-6" aria-labelledby="ch-h">
          <h2
            id="ch-h"
            className="text-sm font-medium text-ink-500"
          >
            Your cause
          </h2>

          {charity ? (
            <>
              <p className="mt-3 font-display text-xl font-bold">
                {charity.name}
              </p>

              <p className="text-sm text-lagoon-700">
                {charity.category}
              </p>

              <p className="mt-4 text-sm text-ink-500">
                <span className="font-semibold text-ink">
                  {profile?.charity_percent}%
                </span>{" "}
                of your subscription goes to this charity.
              </p>
            </>
          ) : (
            <p className="mt-3 text-sm text-ink-500">
              You haven&apos;t chosen a charity yet.
            </p>
          )}
        </section>
      </div>
{/* WINNER VERIFICATION */}
{entitled && winningEntry && (
  <section className="card p-6 border-2 border-lagoon-200">
    <div>
      <span className="inline-flex rounded-full bg-lagoon-100 px-3 py-1 text-sm font-semibold text-lagoon-700">
        🏆 Winner
      </span>

      <h2 className="mt-3 text-2xl font-bold">
        Congratulations!
      </h2>

      <p className="mt-2 text-ink-500">
        You matched{" "}
        <strong className="text-ink">
          {winningEntry.match_count} numbers
        </strong>{" "}
        in the monthly draw.
      </p>
    </div>

    {existingVerification ? (
      <div className="mt-5 rounded-xl bg-ink-50 p-4">
        <p className="font-semibold capitalize">
          Verification: {existingVerification.verification_status}
        </p>

        <p className="mt-1 text-sm text-ink-500 capitalize">
          Payout: {existingVerification.payout_status}
        </p>
      </div>
    ) : (
      <form
        action={submitWinnerProof}
        className="mt-6 space-y-4 rounded-2xl bg-ink-50 p-4"
      >
        <input
          type="hidden"
          name="draw_entry_id"
          value={winningEntry.id}
        />

        <div>
          <label
            htmlFor="proof"
            className="block text-sm font-medium"
          >
            Upload proof
          </label>

          <p className="mt-1 text-xs text-ink-500">
            Upload a screenshot showing your winning score/draw result.
          </p>

          <input
            id="proof"
            name="proof"
            type="file"
            accept="image/*"
            required
            className="mt-3 block w-full rounded-xl border border-ink-200 bg-white p-2 text-sm"
          />
        </div>

        <button
          type="submit"
          className="rounded-xl bg-[#17194f] px-5 py-2.5 font-semibold text-white hover:bg-[#25286b]"
        >
          Submit Proof
        </button>
      </form>
    )}
  </section>
)}
      {/* SCORE ENTRY */}
      {entitled && (
        <section className="card p-6" aria-labelledby="scores-heading">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2
                id="scores-heading"
                className="text-xl font-bold"
              >
                Your Scores
              </h2>

              <p className="mt-1 text-sm text-ink-500">
                Add your latest Stableford scores. Your 5 most recent scores
                are used for the monthly draw.
              </p>
            </div>

            <span className="rounded-full bg-lagoon-100 px-3 py-1 text-sm font-semibold text-lagoon-700">
              {scores?.length ?? 0}/5 scores
            </span>
          </div>

          <form
            action={addScore}
            className="mt-6 grid gap-4 rounded-2xl bg-ink-50 p-4 sm:grid-cols-[1fr_1fr_auto]"
          >
            <div>
              <label
                htmlFor="score"
                className="block text-sm font-medium"
              >
                Stableford score
              </label>

              <input
                id="score"
                name="score"
                type="number"
                min="1"
                max="45"
                required
                placeholder="e.g. 32"
                className="mt-1 w-full rounded-xl border border-ink-200 bg-white px-3 py-2"
              />
            </div>

            <div>
              <label
                htmlFor="played_on"
                className="block text-sm font-medium"
              >
                Played on
              </label>

              <input
                id="played_on"
                name="played_on"
                type="date"
                max={new Date().toISOString().split("T")[0]}
                required
                className="mt-1 w-full rounded-xl border border-ink-200 bg-white px-3 py-2"
              />
            </div>

            <button
              type="submit"
              className="self-end rounded-xl bg-[#17194f] px-5 py-2.5 font-semibold text-white hover:bg-[#25286b]"
            >
              Add Score
            </button>
          </form>

          {scores && scores.length > 0 ? (
            <div className="mt-6 space-y-3">
              {scores.map((score) => (
                <div
                  key={score.id}
                  className="rounded-2xl border border-ink-100 bg-white p-4"
                >
                  <form
                    action={updateScore}
                    className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto]"
                  >
                    <input
                      type="hidden"
                      name="id"
                      value={score.id}
                    />

                    <div>
                      <label className="block text-xs text-ink-500">
                        Score
                      </label>

                      <input
                        name="score"
                        type="number"
                        min="1"
                        max="45"
                        defaultValue={score.score}
                        required
                        className="mt-1 w-full rounded-xl border border-ink-200 px-3 py-2"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-ink-500">
                        Date
                      </label>

                      <input
                        name="played_on"
                        type="date"
                        defaultValue={score.played_on}
                        max={new Date().toISOString().split("T")[0]}
                        required
                        className="mt-1 w-full rounded-xl border border-ink-200 px-3 py-2"
                      />
                    </div>

                    <button
                      type="submit"
                      className="self-end rounded-xl bg-[#17194f] px-4 py-2.5 font-semibold text-white hover:bg-[#25286b]"
                    >
                      Update
                    </button>
                  </form>

                  <form action={deleteScore} className="mt-2">
                    <input
                      type="hidden"
                      name="id"
                      value={score.id}
                    />

                    <button
                      type="submit"
                      className="text-sm font-medium text-red-600 hover:underline"
                    >
                      Delete score
                    </button>
                  </form>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-ink-200 p-6 text-center">
              <p className="text-sm text-ink-500">
                No scores added yet. Add your first score above.
              </p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}