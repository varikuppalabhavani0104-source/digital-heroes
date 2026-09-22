"use client";

import { useState } from "react";

type Props = {
  drawId: string;
};

export default function PublishDrawButton({ drawId }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handlePublish() {
    if (
      !window.confirm(
        "Are you sure you want to publish this draw? This cannot be undone."
      )
    ) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/draws/publish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ drawId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Publishing failed.");
      }

      window.location.reload();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Publishing failed."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-3">
      <button
  type="button"
  onClick={handlePublish}
  disabled={loading}
  style={{
    backgroundColor: "#17174f",
    color: "#ffffff",
    padding: "10px 16px",
    borderRadius: "12px",
    fontWeight: 600,
    display: "inline-block",
    opacity: 1,
    visibility: "visible",
  }}
>
  {loading ? "Publishing..." : "Publish Draw"}
</button>

      {error && (
        <p className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}