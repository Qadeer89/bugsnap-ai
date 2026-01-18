"use client";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function JiraReconnectModal({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal" style={{ width: 420 }}>
        <h3>🔌 Jira Connection Required</h3>

        <p style={{ marginTop: 12 }}>
          Your Jira session has expired or was disconnected.
        </p>

        <p style={{ fontSize: 13, color: "#666", marginTop: 6 }}>
          Please reconnect your Jira account to continue pushing issues.
          <br />
          Your current bug draft is safe.
        </p>

        <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
          <a
            className="primary"
            href="/api/jira/connect"
            target="_blank"
            rel="noreferrer"
          >
            🔁 Reconnect Jira
          </a>

          <button className="secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
