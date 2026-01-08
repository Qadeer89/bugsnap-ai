"use client";

import { useEffect, useState } from "react";

type UserRow = {
  email: string;
  created_at: string;
  is_beta: number;
  is_pro: number;
  bug_count: number;
};

export default function AdminPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadUsers() {
    const res = await fetch("/api/admin/users", { cache: "no-store" });
    if (!res.ok) {
      alert("Access denied or failed to load users");
      return;
    }
    const data = await res.json();
    setUsers(data);
    setLoading(false);
  }

  async function toggleBeta(email: string) {
    await fetch(`/api/admin/users/${encodeURIComponent(email)}/beta`, {
      method: "POST",
    });
    loadUsers();
  }

  async function togglePro(email: string) {
    await fetch(`/api/admin/users/${encodeURIComponent(email)}/pro`, {
      method: "POST",
    });
    loadUsers();
  }

  useEffect(() => {
    loadUsers();
  }, []);

  if (loading) {
    return (
      <div className="container">
        <p>Loading admin panel...</p>
      </div>
    );
  }

  return (
    <div className="container">
      <h1>👮 Admin Panel</h1>

      <table
        style={{
          width: "100%",
          marginTop: 20,
          borderCollapse: "collapse",
        }}
      >
        <thead>
          <tr>
            <th align="left">Email</th>
            <th>Beta</th>
            <th>Pro</th>
            <th>Bugs</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {users.map((u) => (
            <tr key={u.email} style={{ borderTop: "1px solid #eee" }}>
              <td>{u.email}</td>
              <td style={{ textAlign: "center" }}>
                {u.is_beta ? "✅" : "❌"}
              </td>
              <td style={{ textAlign: "center" }}>
                {u.is_pro ? "💎" : "❌"}
              </td>
              <td style={{ textAlign: "center" }}>{u.bug_count}</td>
              <td style={{ textAlign: "center" }}>
                {new Date(u.created_at).toLocaleDateString()}
              </td>
              <td>
                <div style={{ display: "flex", gap: 8 }}>
                  {/* Beta Toggle */}
                  <button
                    className="secondary"
                    onClick={() => toggleBeta(u.email)}
                  >
                    {u.is_beta ? "Revoke Beta" : "Approve Beta"}
                  </button>

                  {/* Pro Toggle */}
                  <button
                    className="secondary"
                    onClick={() => togglePro(u.email)}
                  >
                    {u.is_pro ? "Disable Pro" : "Enable Pro"}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
