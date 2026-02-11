"use client";

import { useEffect, useState } from "react";

export default function ActionBar() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch("/api/jira/status", { cache: "no-store" });
        const data = await res.json();
        setConnected(!!data.connected);
      } catch {
        setConnected(false);
      } finally {
        setLoading(false);
      }
    }

    checkStatus();
  }, []);

  if (loading) return null;

  function connectJira() {
    window.location.href = "/api/jira/connect";
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        fontSize: 14,
        fontWeight: 600,
        background: "#f8fafc",
        padding: "6px 10px",
        borderRadius: 10,
        border: "1px solid #e5e7eb",
      }}
    >
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: connected ? "#22c55e" : "#ef4444",
          display: "inline-block",
        }}
      />

      <span>
        Jira: {connected ? "Connected" : "Not Connected"}
      </span>

      {!connected && (
        <button
          onClick={connectJira}
          style={{
            padding: "6px 10px",
            borderRadius: 8,
            border: "1px solid #e5e7eb",
            background: "#ffffff",
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          Connect Jira
        </button>
      )}
    </div>
  );
}
