import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function approveWinner(formData: FormData) {
  "use server";

  const winnerId = String(formData.get("winner_id") || "");

  if (!winnerId) {
    throw new Error("Missing winner ID");
  }

  const supabase = createClient();

  // Get the winner so we also know its draw entry and user
  const { data: winner, error: winnerError } = await supabase
    .from("winners")
    .select("id, draw_entry_id, user_id")
    .eq("id", winnerId)
    .single();

  if (winnerError || !winner) {
    throw new Error(winnerError?.message || "Winner not found");
  }

  // Mark winner as approved
  const { error: updateWinnerError } = await supabase
    .from("winners")
    .update({
      verification: "approved",
    })
    .eq("id", winnerId);

  if (updateWinnerError) {
    throw new Error(updateWinnerError.message);
  }

  // Mark verification record as approved
  const { error: verificationError } = await supabase
    .from("winner_verifications")
    .update({
      verification_status: "approved",
      verified_at: new Date().toISOString(),
    })
    .eq("draw_entry_id", winner.draw_entry_id);

  if (verificationError) {
    throw new Error(verificationError.message);
  }

  revalidatePath("/admin/winners");
}

export const dynamic = "force-dynamic";

type Draw = {
  id: string;
  draw_month: string;
  status: string;
  winning_numbers: number[] | null;
  pool_5_paise: number;
  pool_4_paise: number;
  pool_3_paise: number;
  jackpot_rolled_over: boolean;
};

type Winner = {
  id: string;
  draw_id: string;
  draw_entry_id: string;
  user_id: string;
  match_tier: number;
  prize_paise: number;
  verification: string;
  payment: string;
  proof_path: string | null;
  proof_url: string | null;
  admin_note: string | null;
  reviewed_at: string | null;
  paid_at: string | null;
  profiles:
    | {
        full_name: string;
        email: string;
      }
    | null;
};

function formatINR(paise: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

function formatMonth(date: string) {
  return new Date(date).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

export default async function WinnersPage() {
  const supabase = createClient();

  // -----------------------------
  // LOAD PUBLISHED DRAWS
  // -----------------------------
  const { data: draws, error: drawsError } = await supabase
    .from("draws")
    .select(
      "id, draw_month, status, winning_numbers, pool_5_paise, pool_4_paise, pool_3_paise, jackpot_rolled_over"
    )
    .eq("status", "published")
    .order("draw_month", { ascending: false });

  if (drawsError) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Winners &amp; Payouts</h1>

        <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
          Couldn&apos;t load draws: {drawsError.message}
        </div>
      </div>
    );
  }

  const drawList = (draws ?? []) as Draw[];

  // -----------------------------
  // LOAD WINNERS
  // -----------------------------
  const { data: winnerRows, error: winnersError } = await supabase
    .from("winners")
    .select(`
      id,
      draw_id,
      draw_entry_id,
      user_id,
      match_tier,
      prize_paise,
      verification,
      payment,
      proof_path,
      admin_note,
      reviewed_at,
      paid_at,
      profiles (
        full_name,
        email
      )
    `)
    .order("created_at", { ascending: false });

  if (winnersError) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Winners &amp; Payouts</h1>

        <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">
          Couldn&apos;t load winners: {winnersError.message}
        </div>
      </div>
    );
  }

  // LOAD ACTUAL PROOF PATHS FROM winner_verifications
const { data: verificationRows, error: verificationError } =
  await supabase
    .from("winner_verifications")
    .select(`
      draw_entry_id,
      proof_path,
      verification_status,
      payout_status,
      admin_notes,
      verified_at,
      paid_at
    `);

if (verificationError) {
  console.error(
    "Failed to load winner verifications:",
    verificationError
  );
}

const winners: Winner[] = await Promise.all(
  ((winnerRows ?? []) as unknown as Winner[]).map(async (winner) => {
    // IMPORTANT:
    // Proof is stored against draw_entry_id in winner_verifications
    const verification = (verificationRows ?? []).find(
      (row) => row.draw_entry_id === winner.draw_entry_id
    );

    const actualProofPath = verification?.proof_path ?? null;

    let proof_url: string | null = null;

    if (actualProofPath) {
      const { data, error } = await supabase.storage
        .from("winner-proofs")
        .createSignedUrl(actualProofPath, 60 * 60);

      if (!error && data?.signedUrl) {
        proof_url = data.signedUrl;
      } else {
        console.error(
          "Failed to create signed proof URL:",
          actualProofPath,
          error
        );
      }
    }

    return {
      ...winner,

      // Use the REAL proof path from winner_verifications
      proof_path: actualProofPath,

      // Temporary signed URL for admin
      proof_url,
    };
  })
);

  // -----------------------------
  // PAGE
  // -----------------------------
  return (
    <div className="animate-rise space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Winners &amp; Payouts</h1>

        <p className="mt-1 text-sm text-ink-500">
          View verified winners, prize amounts and payout status.
        </p>
      </div>

      {drawList.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-10 text-center">
          <h2 className="text-lg font-semibold">No completed draws yet</h2>
        </div>
      ) : (
        <div className="space-y-6">
          {drawList.map((draw) => {
            const drawWinners = winners.filter(
              (winner) => winner.draw_id === draw.id
            );

            return (
              <section
                key={draw.id}
                className="rounded-2xl border border-ink-100 bg-white shadow-sm"
              >
                {/* DRAW HEADER */}
                <div className="border-b border-ink-100 p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 className="text-2xl font-bold text-[#17194f]">
                        {formatMonth(draw.draw_month)}
                      </h2>

                      <p className="mt-1 text-sm text-ink-500">
                        Winning numbers
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {(draw.winning_numbers ?? []).map((number) => (
                          <span
                            key={number}
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-[#17194f] text-sm font-bold text-white"
                          >
                            {number}
                          </span>
                        ))}
                      </div>
                    </div>

                    <span className="rounded-full bg-lagoon-100 px-3 py-1 text-sm font-semibold capitalize text-lagoon-700">
                      {draw.status}
                    </span>
                  </div>
                </div>

                {/* JACKPOT ROLLOVER */}
                {draw.jackpot_rolled_over && (
                  <div className="mx-6 mt-6 rounded-xl bg-sun-100 p-4 text-sm font-medium text-sun-700">
                    No 5-match winner — the jackpot has been rolled over.
                  </div>
                )}

                {/* WINNERS */}
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Winners</h3>

                    <span className="text-sm text-ink-500">
                      {drawWinners.length} winner
                      {drawWinners.length === 1 ? "" : "s"}
                    </span>
                  </div>

                  {drawWinners.length === 0 ? (
                    <div className="mt-4 rounded-xl border border-dashed border-ink-200 p-6 text-center">
                      <p className="text-sm text-ink-500">
                        No recorded winners for this draw.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full min-w-[1000px] text-left text-sm">
                        <thead>
                          <tr className="border-b border-ink-100 text-ink-500">
                            <th className="px-3 py-3 font-medium">
                              Member
                            </th>

                            <th className="px-3 py-3 font-medium">
                              Match tier
                            </th>

                            <th className="px-3 py-3 font-medium">
                              Prize
                            </th>

                            <th className="px-3 py-3 font-medium">
                              Verification
                            </th>

                            <th className="px-3 py-3 font-medium">
                              Payout
                            </th>

                            <th className="px-3 py-3 font-medium">
                              Proof & Actions
                            </th>
                          </tr>
                        </thead>

                        <tbody>
                          {drawWinners.map((winner) => (
                            <tr
                              key={winner.id}
                              className="border-b border-ink-100 last:border-0"
                            >
                              {/* MEMBER */}
                              <td className="px-3 py-4">
                                <p className="font-semibold text-ink">
                                  {winner.profiles?.full_name ||
                                    "Unknown member"}
                                </p>

                                <p className="text-xs text-ink-500">
                                  {winner.profiles?.email ||
                                    winner.user_id}
                                </p>
                              </td>

                              {/* MATCH */}
                              <td className="px-3 py-4">
                                <span className="rounded-full bg-lagoon-100 px-3 py-1 font-semibold text-lagoon-700">
                                  {winner.match_tier}/5
                                </span>
                              </td>

                              {/* PRIZE */}
                              <td className="px-3 py-4 font-semibold">
                                {formatINR(winner.prize_paise)}
                              </td>

                              {/* VERIFICATION */}
                              <td className="px-3 py-4">
                                <span className="rounded-full bg-ink-100 px-3 py-1 text-xs font-semibold">
                                  {winner.verification}
                                </span>

                                {winner.proof_path && (
                                  <p className="mt-1 text-xs text-ink-500">
                                    Proof submitted
                                  </p>
                                )}
                              </td>

                              {/* PAYOUT */}
                              <td className="px-3 py-4">
                                <span className="rounded-full bg-sun-100 px-3 py-1 text-xs font-semibold text-sun-700">
                                  {winner.payment}
                                </span>

                                {winner.paid_at && (
                                  <p className="mt-1 text-xs text-ink-500">
                                    Paid
                                  </p>
                                )}
                              </td>

                              {/* PROOF + ACTIONS */}
<td className="px-3 py-4">
  <div className="flex flex-wrap gap-2">
    {winner.proof_url ? (
      <a
        href={winner.proof_url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex rounded-lg bg-[#17194f] px-4 py-2 text-xs font-semibold text-white hover:opacity-90"
      >
        View Proof
      </a>
    ) : (
      <span className="text-xs text-ink-400">
        No proof
      </span>
    )}

    {winner.verification === "pending_review" && (
      <>
        

        
      </>
    )}

    

    {winner.payment === "paid" && (
      <span className="rounded-lg bg-lagoon-100 px-3 py-2 text-xs font-semibold text-lagoon-700">
        ✓ Paid
      </span>
    )}
  </div>
</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}