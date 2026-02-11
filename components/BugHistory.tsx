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
  search: string;
  setSearch: (s: string) => void;
  onSelect: (bug: Bug | null) => void;
  setHistory: React.Dispatch<React.SetStateAction<Bug[]>>;
  reloadFirstPage: () => Promise<void>;   // ✅ IMPORTANT
};

function sortBugs(bugs: Bug[]) {
  return [...bugs].sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) {
      return b.is_pinned - a.is_pinned; // pinned first
    }
    return (
      new Date(b.created_at).getTime() -
      new Date(a.created_at).getTime()
    );
  });
}

export default function BugHistory({
  bugs,
  search,
  setSearch,
  onSelect,
  setHistory,
  reloadFirstPage,   // ✅ ADDED (you had missed this in destructuring)
}: Props) {

  async function togglePin(id: number) {
    const res = await fetch(`/api/history/${id}/pin`, { method: "POST" });
    if (!res.ok) return;

    const data = await res.json(); // { success, is_pinned }

    // ✅ 1) Instant local update (fast UI)
    setHistory((prev) =>
      sortBugs(
        prev.map((b) =>
          b.id === id ? { ...b, is_pinned: data.is_pinned } : b
        )
      )
    );

    // ✅ 2) Silent background refresh from server (data consistency)
    await reloadFirstPage();
  }

  async function deleteBug(id: number) {
    const res = await fetch(`/api/history/${id}`, { method: "DELETE" });
    if (!res.ok) return;

    setHistory((prev) => prev.filter((b) => b.id !== id));
  }

  const filteredBugs = bugs.filter((b) =>
    b.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="card">
      <div className="card-title">📚 Bug History</div>

      {/* ✅ SEARCH (unchanged) */}
      <input
        type="text"
        placeholder="Search by title..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{
          width: "100%",
          padding: "6px 8px",
          marginBottom: 10,
          borderRadius: 8,
          border: "1px solid #e5e7eb",
        }}
      />

      {filteredBugs.map((bug) => (
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
