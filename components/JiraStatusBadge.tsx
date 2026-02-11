import { useEffect, useState } from "react";

type JiraStatus = {
  connected: boolean;
  reason?: string;
  error?: string;
};

export default function JiraStatusBadge() {
  const [status, setStatus] = useState<JiraStatus | null>(null);
  const [httpStatus, setHttpStatus] = useState<number | null>(null);

  async function fetchStatus() {
    try {
      const res = await fetch("/api/jira/status");
      const data = await res.json();
      setHttpStatus(res.status);
      setStatus(data);
    } catch (e) {
      console.error("Failed to fetch Jira status", e);
    }
  }

  useEffect(() => {
    fetchStatus();
  }, []);

  // Hide for Free users
  if (httpStatus === 403 && status?.error === "PRO_ONLY") {
    return null;
  }

  if (!status) {
    return <span style={{ opacity: 0.6 }}>Checking Jira…</span>;
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {status.connected && (
        <span style={{ color: "green" }}>🟢 Jira: Connected</span>
      )}

      {!status.connected && status.reason === "NOT_CONNECTED" && (
        <>
          <span style={{ color: "red" }}>🔴 Jira: Not Connected</span>
          <button
            style={{ marginLeft: 6 }}
            onClick={() => (window.location.href = "/api/jira/connect")}
          >
            Connect Jira
          </button>
        </>
      )}

      {!status.connected && status.reason === "EXPIRED" && (
        <>
          <span style={{ color: "orange" }}>🟡 Jira: Reconnect Required</span>
          <button
            style={{ marginLeft: 6 }}
            onClick={() => (window.location.href = "/api/jira/connect")}
          >
            Reconnect Jira
          </button>
        </>
      )}
    </div>
  );
}
