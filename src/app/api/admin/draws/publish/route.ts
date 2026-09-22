import { NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";

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

    // Load simulated draw
    const { data: draw, error: drawError } = await admin
      .from("draws")
      .select(
        "id, status, pool_5_paise, pool_4_paise, pool_3_paise, jackpot_rolled_over"
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
        { error: "This draw is already published." },
        { status: 400 }
      );
    }

    if (draw.status !== "simulated") {
      return NextResponse.json(
        { error: "Only simulated draws can be published." },
        { status: 400 }
      );
    }

    // Get simulated entries
    const { data: entries, error: entriesError } = await admin
      .from("draw_entries")
      .select("id, user_id, match_count")
      .eq("draw_id", drawId);

    if (entriesError) {
      throw entriesError;
    }

    const winners5 = (entries ?? []).filter(
      (entry) => entry.match_count === 5
    );

    const winners4 = (entries ?? []).filter(
      (entry) => entry.match_count === 4
    );

    const winners3 = (entries ?? []).filter(
      (entry) => entry.match_count === 3
    );

    // Remove any previous winner records for this draw
    await admin.from("winners").delete().eq("draw_id", drawId);

    const winnerRows = [];

    if (winners5.length > 0) {
      const prize = Math.floor(
        (draw.pool_5_paise ?? 0) / winners5.length
      );

      for (const winner of winners5) {
        winnerRows.push({
          draw_id: drawId,
          draw_entry_id: winner.id,
          user_id: winner.user_id,
          match_tier: 5,
          prize_paise: prize,
          verification: "awaiting_proof",
          payment: "pending",
        });
      }
    }

    if (winners4.length > 0) {
      const prize = Math.floor(
        (draw.pool_4_paise ?? 0) / winners4.length
      );

      for (const winner of winners4) {
        winnerRows.push({
          draw_id: drawId,
          draw_entry_id: winner.id,
          user_id: winner.user_id,
          match_tier: 4,
          prize_paise: prize,
          verification: "awaiting_proof",
          payment: "pending",
        });
      }
    }

    if (winners3.length > 0) {
      const prize = Math.floor(
        (draw.pool_3_paise ?? 0) / winners3.length
      );

      for (const winner of winners3) {
        winnerRows.push({
          draw_id: drawId,
          draw_entry_id: winner.id,
          user_id: winner.user_id,
          match_tier: 3,
          prize_paise: prize,
          verification: "awaiting_proof",
          payment: "pending",
        });
      }
    }

    if (winnerRows.length > 0) {
      const { error: winnersError } = await admin
        .from("winners")
        .insert(winnerRows);

      if (winnersError) {
        throw winnersError;
      }
    }

    // If nobody matched all 5 numbers, the jackpot rolls over.
    const jackpotRolledOver = winners5.length === 0;

    const { error: updateError } = await admin
      .from("draws")
      .update({
        status: "published",
        jackpot_rolled_over: jackpotRolledOver,
        published_at: new Date().toISOString(),
      })
      .eq("id", drawId);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      winners: {
        five: winners5.length,
        four: winners4.length,
        three: winners3.length,
      },
      jackpotRolledOver,
    });
  } catch (error) {
    console.error("[admin/draws/publish]", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Publishing failed.",
      },
      { status: 500 }
    );
  }
}