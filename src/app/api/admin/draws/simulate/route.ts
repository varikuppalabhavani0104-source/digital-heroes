import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";

const SCORE_MIN = 1;
const SCORE_MAX = 45;
const SCORES_REQUIRED = 5;

function randomNumbers(count: number) {
  const numbers = Array.from(
    { length: SCORE_MAX - SCORE_MIN + 1 },
    (_, i) => i + SCORE_MIN
  );

  for (let i = numbers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
  }

  return numbers.slice(0, count).sort((a, b) => a - b);
}

function weightedNumbers(
  scores: number[],
  count: number
) {
  const frequency = new Map<number, number>();

  for (const score of scores) {
    frequency.set(score, (frequency.get(score) ?? 0) + 1);
  }

  const pool = Array.from(
    { length: SCORE_MAX - SCORE_MIN + 1 },
    (_, i) => i + SCORE_MIN
  );

  const selected: number[] = [];

  while (selected.length < count && pool.length > 0) {
    const weights = pool.map((number) => frequency.get(number) ?? 0);

    const totalWeight =
      weights.reduce((sum, weight) => sum + weight, 0) || pool.length;

    let random = Math.random() * totalWeight;
    let selectedIndex = 0;

    for (let i = 0; i < pool.length; i++) {
      const weight = weights[i] || 1;

      random -= weight;

      if (random <= 0) {
        selectedIndex = i;
        break;
      }
    }

    selected.push(pool[selectedIndex]);
    pool.splice(selectedIndex, 1);
  }

  return selected.sort((a, b) => a - b);
}

export async function POST(request: Request) {
  try {
    const supabase = createClient();

    // Check logged-in user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check admin role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const drawId = String(body.drawId || "");

    if (!drawId) {
      return NextResponse.json(
        { error: "drawId is required." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // ------------------------------------------------------------
    // 1. Load the draw
    // ------------------------------------------------------------

    const { data: draw, error: drawError } = await admin
      .from("draws")
      .select(
        "id, draw_month, draw_type, status, jackpot_carry_paise"
      )
      .eq("id", drawId)
      .single();

    if (drawError || !draw) {
      return NextResponse.json(
        { error: "Draw not found." },
        { status: 404 }
      );
    }

    if (draw.status === "published") {
      return NextResponse.json(
        { error: "Published draws cannot be simulated again." },
        { status: 400 }
      );
    }

    // ------------------------------------------------------------
    // 2. Get current active subscribers
    // ------------------------------------------------------------

    const now = new Date();

    const { data: subscriptions, error: subscriptionError } =
      await admin
        .from("subscriptions")
        .select(
          "user_id, plan, amount_paise, current_period_end"
        )
        .eq("status", "active");

    if (subscriptionError) {
      throw subscriptionError;
    }

    const activeSubscriptions = (subscriptions ?? []).filter((sub) => {
      if (!sub.current_period_end) return true;

      return new Date(sub.current_period_end) >= now;
    });

    const activeUserIds = [
      ...new Set(activeSubscriptions.map((sub) => sub.user_id)),
    ];

    // ------------------------------------------------------------
    // 3. Get latest scores for active subscribers
    // ------------------------------------------------------------

    const { data: scoreRows, error: scoreError } = await admin
      .from("scores")
      .select("user_id, score, played_on, created_at")
      .in(
        "user_id",
        activeUserIds.length ? activeUserIds : ["00000000-0000-0000-0000-000000000000"]
      )
      .order("played_on", { ascending: false })
      .order("created_at", { ascending: false });

    if (scoreError) {
      throw scoreError;
    }

    const scoresByUser = new Map<
      string,
      { score: number; played_on: string; created_at: string }[]
    >();

    for (const row of scoreRows ?? []) {
      const existing = scoresByUser.get(row.user_id) ?? [];

      if (existing.length < SCORES_REQUIRED) {
        existing.push(row);
        scoresByUser.set(row.user_id, existing);
      }
    }

    // Only users with 5 scores can participate.
    const participants = activeUserIds
      .map((userId) => ({
        userId,
        scores: scoresByUser.get(userId) ?? [],
      }))
      .filter(
        (participant) =>
          participant.scores.length === SCORES_REQUIRED
      );

    // ------------------------------------------------------------
    // 4. Generate winning numbers
    // ------------------------------------------------------------

    const allScores = participants.flatMap((participant) =>
      participant.scores.map((row) => row.score)
    );

    const winningNumbers =
      draw.draw_type === "algorithmic"
        ? weightedNumbers(allScores, 5)
        : randomNumbers(5);

    // ------------------------------------------------------------
    // 5. Calculate matches for every participant
    // ------------------------------------------------------------

    const entries = participants.map((participant) => {
      const participantScores = participant.scores.map(
        (row) => row.score
      );

      const matchCount = participantScores.filter((score) =>
        winningNumbers.includes(score)
      ).length;

      return {
        draw_id: draw.id,
        user_id: participant.userId,
        scores: participantScores,
        match_count: matchCount,
      };
    });

    const winners5 = entries.filter(
      (entry) => entry.match_count === 5
    );

    const winners4 = entries.filter(
      (entry) => entry.match_count === 4
    );

    const winners3 = entries.filter(
      (entry) => entry.match_count === 3
    );

    // ------------------------------------------------------------
    // 6. Calculate prize pool
    // ------------------------------------------------------------

    const { data: settings, error: settingsError } = await admin
      .from("app_settings")
      .select("monthly_price_paise, prize_pool_percent")
      .single();

    if (settingsError) {
      throw settingsError;
    }

    /*
     * The PRD defines the prize pool as a fixed portion of
     * subscriptions and the app settings contain that percentage.
     *
     * Pool is based on the number of active subscribers.
     */
    const freshPrizePoolPaise = Math.round(
      activeSubscriptions.length *
        settings.monthly_price_paise *
        (settings.prize_pool_percent / 100)
    );

    const pool5Fresh = Math.floor(
      (freshPrizePoolPaise * 40) / 100
    );

    const pool4 = Math.floor(
      (freshPrizePoolPaise * 35) / 100
    );

    const pool3 = Math.floor(
      (freshPrizePoolPaise * 25) / 100
    );

    const jackpotCarry = draw.jackpot_carry_paise ?? 0;

    // 5-match pool includes previous jackpot carry.
    const pool5 = pool5Fresh + jackpotCarry;

    // ------------------------------------------------------------
    // 7. Save draw entries
    // ------------------------------------------------------------

    // Remove previous simulation snapshot if this draw
    // has already been simulated.
    const { error: deleteEntriesError } = await admin
      .from("draw_entries")
      .delete()
      .eq("draw_id", draw.id);

    if (deleteEntriesError) {
      throw deleteEntriesError;
    }

    if (entries.length > 0) {
      const { error: entriesError } = await admin
        .from("draw_entries")
        .insert(entries);

      if (entriesError) {
        throw entriesError;
      }
    }

    // ------------------------------------------------------------
    // 8. Prepare simulation result
    // ------------------------------------------------------------

    const simulation = {
      generated_at: now.toISOString(),
      draw_type: draw.draw_type,
      winning_numbers: winningNumbers,

      active_subscribers: activeSubscriptions.length,
      eligible_participants: participants.length,

      prize_pool_paise: freshPrizePoolPaise,

      pools: {
        pool_5_paise: pool5,
        pool_4_paise: pool4,
        pool_3_paise: pool3,
        jackpot_carry_paise: jackpotCarry,
      },

      winner_counts: {
        five_match: winners5.length,
        four_match: winners4.length,
        three_match: winners3.length,
      },

      jackpot_rolled_over: winners5.length === 0,
    };

    // ------------------------------------------------------------
    // 9. Save simulation on the draw
    // ------------------------------------------------------------

    const { error: updateError } = await admin
      .from("draws")
      .update({
        status: "simulated",
        winning_numbers: winningNumbers,
        active_subscribers: activeSubscriptions.length,
        prize_pool_paise: freshPrizePoolPaise,
        jackpot_carry_paise: jackpotCarry,
        pool_5_paise: pool5,
        pool_4_paise: pool4,
        pool_3_paise: pool3,
        jackpot_rolled_over: winners5.length === 0,
        simulation,
      })
      .eq("id", draw.id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      simulation,
    });
  } catch (error) {
    console.error("[admin/draws/simulate]", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Simulation failed.",
      },
      { status: 500 }
    );
  }
}