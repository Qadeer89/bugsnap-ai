"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  severity: string;
  image: string | null;
  onAuthExpired: () => void; // kept for compatibility, NOT USED
};

type Option = { id: string; name: string };

function mapSeverityToPriorityName(sev: string) {
  const s = (sev || "").toLowerCase();
  if (s.includes("critical") || s.includes("blocker")) return "Highest";
  if (s.includes("major") || s.includes("high")) return "High";
  if (s.includes("medium")) return "Medium";
  if (s.includes("minor") || s.includes("low")) return "Low";
  return "Medium";
}

export default function JiraPushModal({
  open,
  onClose,
  title,
  description,
  severity,
  image,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<"idle" | "creating" | "uploading" | "done">(
    "idle"
  );

  const [error, setError] = useState<string | null>(null);
  const [needsConnect, setNeedsConnect] = useState(false);

  const [projects, setProjects] = useState<Option[]>([]);
  const [issueTypes, setIssueTypes] = useState<Option[]>([]);
  const [priorities, setPriorities] = useState<Option[]>([]);
  const [assignees, setAssignees] = useState<Option[]>([]);
  const [sprints, setSprints] = useState<Option[]>([]);

  const [project, setProject] = useState("");
  const [issueType, setIssueType] = useState("");
  const [priority, setPriority] = useState("");
  const [assignee, setAssignee] = useState("");
  const [sprint, setSprint] = useState("");

  const initializedRef = useRef(false);

  // Reset when closed
  useEffect(() => {
    if (!open) {
      initializedRef.current = false;
      setError(null);
      setNeedsConnect(false);
      setStage("idle");
      setLoading(false);
      setSprint("");
    }
  }, [open]);

  // Load meta on open
  useEffect(() => {
    if (!open || initializedRef.current) return;
    initializedRef.current = true;
    loadMeta();
    // eslint-disable-next-line
  }, [open]);

  async function loadMeta() {
    try {
      setLoading(true);
      setError(null);
      setNeedsConnect(false);

      const res = await fetch("/api/jira/meta");
      const data = await res.json();

      if (!res.ok) {
        if (
          data?.error === "JIRA_RECONNECT_REQUIRED" ||
          data?.error === "JIRA_NOT_CONNECTED"
        ) {
          setNeedsConnect(true);
          return;
        }
        throw new Error("Failed to load Jira metadata");
      }

      const projects = data.projects || [];
      const issueTypes = data.issueTypes || [];
      const priorities = data.priorities || [];
      const assignees = data.assignees || [];
      const sprints = data.sprints || [];

      setProjects(projects);
      setIssueTypes(issueTypes);
      setPriorities(priorities);
      setAssignees(assignees);
      setSprints(sprints);

      const firstProject = projects?.[0]?.id || "";
      setProject(firstProject);

      // Prefer Bug
      const bugType = issueTypes.find(
        (i: any) => i.name.toLowerCase() === "bug"
      );
      setIssueType(bugType?.id || issueTypes?.[0]?.id || "");

      // Auto priority
      const auto = mapSeverityToPriorityName(severity);
      const p = priorities.find(
        (x: any) => x.name.toLowerCase() === auto.toLowerCase()
      );
      if (p) setPriority(p.id);

      setSprint(""); // reset sprint
    } catch (e) {
      setError("Failed to load Jira metadata");
    } finally {
      setLoading(false);
    }
  }

  // 🔁 Reload issue types + sprints when project changes
  useEffect(() => {
    if (!project) return;

    async function reloadProjectMeta() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/jira/meta?projectId=${project}`);
        const data = await res.json();

        if (!res.ok) return;

        const issueTypes = data.issueTypes || [];
        const sprints = data.sprints || [];

        setIssueTypes(issueTypes);
        setSprints(sprints);

        // reset selections
        const bugType = issueTypes.find(
          (i: any) => i.name.toLowerCase() === "bug"
        );
        setIssueType(bugType?.id || issueTypes?.[0]?.id || "");
        setSprint("");
      } catch (e) {
        console.error("Failed to reload project meta");
      } finally {
        setLoading(false);
      }
    }

    reloadProjectMeta();
  }, [project]);

  async function createIssue() {
    if (!project || !issueType) {
      setError("Project and Issue Type are required");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setNeedsConnect(false);
      setStage("creating");

      const res = await fetch("/api/jira/create-issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          projectId: project,
          issueTypeId: issueType,
          priorityId: priority || null,
          assigneeId: assignee || null,
          sprintId: sprint || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data?.error === "JIRA_RECONNECT_REQUIRED") {
          setNeedsConnect(true);
          setStage("idle");
          return;
        }
        throw new Error("Failed to create issue");
      }

      const issueKey = data.jiraKey;

      // 📎 Upload attachment
      if (image) {
        setStage("uploading");

        const a = await fetch("/api/jira/attach", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            issueKey,
            base64Image: image,
          }),
        });

        const ad = await a.json();

        if (!a.ok) {
          if (ad?.error === "JIRA_RECONNECT_REQUIRED") {
            setNeedsConnect(true);
            setStage("idle");
            return;
          }
          console.error("Attachment upload failed", ad);
        }
      }

      setStage("done");

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (e) {
      setError("Failed to create Jira issue");
      setStage("idle");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <div
        style={{
          width: 520,
          maxHeight: "85vh",
          overflowY: "auto",
          background: "#fff",
          borderRadius: 14,
          padding: 20,
          boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
        }}
      >
        <h3>🚀 Push to Jira</h3>

        {error && <div style={{ color: "#ef4444" }}>❌ {error}</div>}

        {/* FORM */}
        {stage === "idle" && !needsConnect && (
          <>
            <div className="form-grid">
              <label>Project</label>
              <select value={project} onChange={(e) => setProject(e.target.value)}>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              <label>Issue Type</label>
              <select
                value={issueType}
                onChange={(e) => setIssueType(e.target.value)}
              >
                {issueTypes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              <label>Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="">Auto</option>
                {priorities.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              <label>Assignee</label>
              <select
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
              >
                <option value="">Unassigned</option>
                {assignees.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>

              {/* 🆕 SPRINT */}
              {sprints.length > 0 && (
                <>
                  <label>Sprint</label>
                  <select
                    value={sprint}
                    onChange={(e) => setSprint(e.target.value)}
                  >
                    <option value="">No Sprint</option>
                    {sprints.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </>
              )}
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button
                className="primary"
                onClick={createIssue}
                disabled={loading}
              >
                Create in Jira
              </button>
              <button className="secondary" onClick={onClose}>
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
