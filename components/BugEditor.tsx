"use client";

import JiraPushModal from "@/components/JiraPushModal";
import { useState } from "react";

type Props = {
  bug: string;
  image: string | null;
};

function extractSection(bug: string, section: string) {
  const regex = new RegExp(`${section}:([\\s\\S]*?)(?=\\n[A-Z][a-zA-Z ]+:|$)`);
  const match = bug.match(regex);
  return match ? match[1].trim() : "";
}

export default function BugEditor({ bug, image }: Props) {
  const title = extractSection(bug, "Title");
  const preconditions = extractSection(bug, "Preconditions");
  const steps = extractSection(bug, "Steps to Reproduce");
  const expected = extractSection(bug, "Expected Result");
  const actual = extractSection(bug, "Actual Result");
  const severity = extractSection(bug, "Severity");
  const area = extractSection(bug, "Suspected Area");

  const description = `
PRECONDITIONS:
${preconditions}

STEPS TO REPRODUCE:
${steps}

EXPECTED RESULT:
${expected}

ACTUAL RESULT:
${actual}

SEVERITY:
${severity}

SUSPECTED AREA:
${area}
`.trim();

  const [copiedTitle, setCopiedTitle] = useState(false);
  const [copiedDesc, setCopiedDesc] = useState(false);

  const [showJiraModal, setShowJiraModal] = useState(false);

  async function copyTitle() {
    await navigator.clipboard.writeText(title);
    setCopiedTitle(true);
    setTimeout(() => setCopiedTitle(false), 1200);
  }

  async function copyDescription() {
    await navigator.clipboard.writeText(description);
    setCopiedDesc(true);
    setTimeout(() => setCopiedDesc(false), 1200);
  }

  return (
    <div className="section" style={{ animation: "fadeInUp 0.4s ease" }}>
      <h3>Jira Ready Output</h3>

      {/* TITLE */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div
          className="card-title"
          style={{ display: "flex", justifyContent: "space-between" }}
        >
          🧾 Title (Jira Summary)
          <button className="secondary" onClick={copyTitle}>
            {copiedTitle ? "✅ Copied" : "📋 Copy"}
          </button>
        </div>
        <textarea rows={2} value={title} readOnly />
      </div>

      {/* DESCRIPTION */}
      <div className="card">
        <div
          className="card-title"
          style={{ display: "flex", justifyContent: "space-between" }}
        >
          📄 Description (Jira Description)
          <button className="secondary" onClick={copyDescription}>
            {copiedDesc ? "✅ Copied" : "📋 Copy"}
          </button>
        </div>

        <p className="note">
          📎 Paste this description into Jira. You can convert headings using Jira
          toolbar.
        </p>

        <textarea rows={16} value={description} readOnly />
      </div>

      {/* AUTO INFO */}
      <div
        style={{
          marginTop: 12,
          padding: 10,
          borderRadius: 8,
          background: "#5b7cc9ff",
          fontSize: 13,
        }}
      >
        🧠 <strong>Detected:</strong> Severity ={" "}
        <strong>{severity || "N/A"}</strong>
      </div>

      {/* ✅ JIRA MODAL */}
      <JiraPushModal
        open={showJiraModal}
        onClose={() => setShowJiraModal(false)}
        title={title}
        description={description}
        severity={severity}
        image={image}
        onAuthExpired={() => {
          setShowJiraModal(false);
          window.location.href = "/api/jira/connect";
        }}
      />

      {/* ANIMATION */}
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
