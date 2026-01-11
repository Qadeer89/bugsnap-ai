"use client";

import { useState } from "react";

type Props = {
  bug: string;
};

function extractSection(bug: string, section: string) {
  const regex = new RegExp(`${section}:([\\s\\S]*?)(?=\\n[A-Z][a-zA-Z ]+:|$)`);
  const match = bug.match(regex);
  return match ? match[1].trim() : "";
}

export default function BugEditor({ bug }: Props) {
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

  async function copyTitle() {
    await navigator.clipboard.writeText(title);
    setCopiedTitle(true);
    setTimeout(() => setCopiedTitle(false), 1500);
  }

  async function copyDescription() {
    await navigator.clipboard.writeText(description);
    setCopiedDesc(true);
    setTimeout(() => setCopiedDesc(false), 1500);
  }

  return (
    <div className="section">
      <h3>Jira Ready Output</h3>

      {/* TITLE */}
      <label>Title (Jira Summary)</label>
      <textarea rows={2} value={title} readOnly />
      <button className="secondary" onClick={copyTitle}>
        {copiedTitle ? "Copied ✓" : "Copy Title"}
      </button>

      <hr />

      {/* DESCRIPTION */}
      <label>Description (Jira Description)</label>

      <p className="note">
        📎 <strong>Note:</strong> Paste this description into Jira.  
        You can optionally convert headings using Jira toolbar.
      </p>

      <textarea rows={15} value={description} readOnly />
      <button className="secondary" onClick={copyDescription}>
        {copiedDesc ? "Copied ✓" : "Copy Description"}
      </button>
    </div>
  );
}
