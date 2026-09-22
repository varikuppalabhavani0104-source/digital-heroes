"use client";

import { useState } from "react";

type Props = {
  drawId: string;
};

export default function SimulateDrawButton({ drawId }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSimulate() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/draws/simulate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ drawId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Simulation failed.");
      }

      window.location.reload();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Simulation failed."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={handleSimulate}
        disabled={loading}
        className="rounded-xl bg-ink-900 px-4 py-2.5 font-semibold text-white disabled:opacity-50"
      >
        {loading ? "TESTING..." : "🔥 SIMULATE DRAW TEST"}
      </button>

      {error && (
        <p className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}