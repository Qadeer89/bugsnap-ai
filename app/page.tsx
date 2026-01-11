"use client";

import { useEffect, useState, useRef } from "react";
import {
  ScreenshotUploader,
  ContextForm,
  GenerateButton,
  BugEditor,
} from "@/components";
import LoadingSteps from "@/components/LoadingSteps";
import AuthButton from "@/components/AuthButton";
import { useSession } from "next-auth/react";
import BugHistory from "@/components/BugHistory";

export default function HomePage() {
  const { data: session, status } = useSession();

  const [image, setImage] = useState<string | null>(null);
  const [intent, setIntent] = useState("");
  const [environment, setEnvironment] = useState("QA");
  const [browser, setBrowser] = useState("");
  const [bug, setBug] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [usage, setUsage] = useState<{ count: number; limit: number } | null>(null);
  const [showProMessage, setShowProMessage] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [isBeta, setIsBeta] = useState<boolean | null>(null);

  const bugSectionRef = useRef<HTMLDivElement | null>(null);

  /* ─────────────────────────────
     RESET FORM (NEW FEATURE)
  ───────────────────────────── */
  function resetForm() {
    setImage(null);
    setIntent("");
    setEnvironment("QA");
    setBrowser("");
    setBug("");
    setLoading(false);
    setLoadingStep(0);

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ─────────────────────────────
     Fetch usage from SERVER (DB)
  ───────────────────────────── */
  async function refreshUsage() {
    const res = await fetch("/api/usage", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    setUsage(data);
  }

  async function loadHistory() {
    const res = await fetch("/api/history", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setHistory(data);
    }
  }

  async function checkBeta() {
    const res = await fetch("/api/me", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setIsBeta(data.is_beta === true);
    }
  }

  /* ─────────────────────────────
     On login → fetch usage, history, beta status
  ───────────────────────────── */
  useEffect(() => {
    if (session) {
      refreshUsage();
      loadHistory();
      checkBeta();
    }
  }, [session]);

  /* ─────────────────────────────
     Auto-scroll to bug output
  ───────────────────────────── */
  useEffect(() => {
    if (bug && bugSectionRef.current) {
      bugSectionRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [bug]);

  /* ─────────────────────────────
     Blur background during loading
  ───────────────────────────── */
  useEffect(() => {
    if (loading) {
      document.body.classList.add("loading");
    } else {
      document.body.classList.remove("loading");
    }
    return () => {
      document.body.classList.remove("loading");
    };
  }, [loading]);

  /* ─────────────────────────────
     LOADING STATES
  ───────────────────────────── */
  if (status === "loading" || (session && isBeta === null)) {
    return (
      <div className="container">
        <p>Checking access...</p>
      </div>
    );
  }

  return (
    <div className="container">
      {/* ───────── HEADER ───────── */}
      <header className="header">
        <h1>🐞 BugSnap AI</h1>
        <p>From screenshot to Jira-ready bug in under a minute.</p>
        <AuthButton />
      </header>

      {/* ───────── NOT LOGGED IN ───────── */}
      {!session && (
        <div className="note" style={{ marginTop: "30px" }}>
          🔒 Please login with Google to generate bugs
        </div>
      )}

      {/* ───────── LOGGED IN BUT NOT BETA ───────── */}
      {session && isBeta === false && (
        <div className="pro-card" style={{ marginTop: 40 }}>
          <h3>🔒 Private Beta</h3>
          <p>Your account is not approved for beta access yet.</p>
          <p>Please contact admin to get access.</p>
        </div>
      )}

      {/* ───────── LOGGED IN + BETA USER ───────── */}
      {session && isBeta === true && (
        <>
          <div style={{ display: "flex", gap: "24px", alignItems: "flex-start" }}>
            {/* ───────── LEFT SIDE ───────── */}
            <div style={{ flex: 1 }}>
              <div className="cards">
                <div className="card">
                  <div className="card-title">📸 Screenshot</div>
                  <ScreenshotUploader image={image} setImage={setImage} />
                </div>

                <div className="card">
                  <div className="card-title">🧠 Context (Optional)</div>
                  <ContextForm
                    intent={intent}
                    setIntent={setIntent}
                    environment={environment}
                    setEnvironment={setEnvironment}
                    browser={browser}
                    setBrowser={setBrowser}
                  />
                </div>
              </div>

              {/* ───────── USAGE ───────── */}
              {usage && usage.limit !== Infinity && (
                <p className="note">
                  🧪 Bugs today: {usage.count} / {usage.limit}
                </p>
              )}

              {/* ───────── GENERATE BUTTON ───────── */}
              <GenerateButton
                image={image}
                intent={intent}
                environment={environment}
                browser={browser}
                setBug={setBug}
                loading={loading}
                setLoading={setLoading}
                setLoadingStep={setLoadingStep}
                onGenerated={() => {
                  refreshUsage();
                  loadHistory();
                }}
                onLimitReached={() => setShowProMessage(true)}
              />
            </div>

            {/* ───────── RIGHT SIDE (HISTORY) ───────── */}
            <div style={{ width: "340px", position: "sticky", top: 20 }}>
              <BugHistory
                bugs={history}
                onSelect={(bugItem) => {
                  if (bugItem) {
                    setBug(bugItem.description);
                  } else {
                    setBug("");
                  }
                }}
              />
            </div>
          </div>
        </>
      )}

      {/* ───────── PRO MESSAGE ───────── */}
      {showProMessage && (
        <div className="pro-card">
          <h3>🚀 Daily free limit reached</h3>
          <p>
            You’ve generated all <strong>3 free bugs</strong> for today.
          </p>
          <ul>
            <li>Unlimited bug reports</li>
            <li>Faster AI responses</li>
            <li>Jira issue creation (coming soon)</li>
          </ul>
          <button className="primary" disabled>
            Upgrade to Pro (Coming Soon)
          </button>
        </div>
      )}

      {/* ───────── LOADING STEPS ───────── */}
      {loading && <LoadingSteps step={loadingStep} />}

      {/* ───────── BUG OUTPUT + RESET BUTTON ───────── */}
      {bug && (
        <div ref={bugSectionRef}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3>Generated Bug</h3>
            <button className="secondary" onClick={resetForm}>
              🆕 Create New Bug
            </button>
          </div>

          <BugEditor bug={bug} />
        </div>
      )}
    </div>
  );
}
