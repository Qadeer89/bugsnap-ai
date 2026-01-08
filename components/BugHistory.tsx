"use client";

type Bug = {
  id: number;
  title: string;
  description: string;
  created_at: string;
  is_pinned: number;
};

type Props = {
  bugs: Bug[];
  onSelect: (bug: Bug | null) => void;
};

export default function BugHistory({ bugs, onSelect }: Props) {
  async function deleteBug(id: number) {
    await fetch(`/api/history/${id}`, { method: "DELETE" });
    window.location.reload(); // simple refresh for now
  }

  async function togglePin(id: number) {
    await fetch(`/api/history/${id}/pin`, { method: "POST" });
    window.location.reload(); // simple refresh for now
  }

  return (
    <div className="card" style={{ maxHeight: 360, overflowY: "auto" }}>
      <div className="card-title">📚 Bug History</div>

      {bugs.map((bug) => (
        <div
          key={bug.id}
          style={{
            padding: "10px",
            borderRadius: 8,
            marginBottom: 8,
            border: "1px solid #eee",
            background: bug.is_pinned ? "#fff7e6" : "#fafafa",
          }}
        >
          <div
            style={{ cursor: "pointer", fontWeight: 600 }}
            onClick={() => onSelect(bug)}
          >
            {bug.is_pinned ? "⭐ " : ""} {bug.title}
          </div>

          <div style={{ fontSize: 12, color: "#666" }}>
            {new Date(bug.created_at).toLocaleString()}
          </div>

          <div style={{ marginTop: 6, display: "flex", gap: 10 }}>
            <button onClick={() => togglePin(bug.id)}>
              {bug.is_pinned ? "Unpin" : "Pin"}
            </button>
            <button onClick={() => deleteBug(bug.id)}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}
