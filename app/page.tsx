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
import JiraPushModal from "@/components/JiraPushModal";

type Mode = "image" | "gif" | "scenario";

const DRAFT_KEY = "bugsnap_draft_v1";
const MIN_SCENARIO_LENGTH = 10;

export default function HomePage() {
  const { data: session, status } = useSession();

  const [mode, setMode] = useState<Mode>("image");
  const [image, setImage] = useState<string | null>(null);
  const [scenario, setScenario] = useState("");
  const [intent, setIntent] = useState("");
  const [environment, setEnvironment] = useState("QA");
  const [browser, setBrowser] = useState("");
  const [bug, setBug] = useState("");

  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  const [usage, setUsage] = useState<{ count: number; limit: number } | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [isBeta, setIsBeta] = useState<boolean | null>(null);
  const [isPro, setIsPro] = useState<boolean>(false);
  const [showProMessage, setShowProMessage] = useState(false);

  const [showJiraModal, setShowJiraModal] = useState(false);

  const bugSectionRef = useRef<HTMLDivElement | null>(null);

  function resetForm() {
    setImage(null);
    setScenario("");
    setIntent("");
    setEnvironment("QA");
    setBrowser("");
    setBug("");
    setLoading(false);
    setLoadingStep(0);
    setMode("image");

    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {}

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function refreshUsage() {
    const res = await fetch("/api/usage", { cache: "no-store" });
    if (res.ok) setUsage(await res.json());
  }

  async function loadHistory() {
    const res = await fetch("/api/history", { cache: "no-store" });
    if (res.ok) setHistory(await res.json());
  }

  async function checkUser() {
    const res = await fetch("/api/me", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setIsBeta(data.is_beta === true);
      setIsPro(data.is_pro === true);
    }
  }

  useEffect(() => {
    if (session) {
      refreshUsage();
      loadHistory();
      checkUser();
    }
  }, [session]);

  useEffect(() => {
    const payload = {
      bug,
      mode,
      image,
      scenario,
      intent,
      environment,
      browser,
    };

    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
    } catch {}
  }, [bug, mode, image, scenario, intent, environment, browser]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const d = JSON.parse(saved);
        setBug(d.bug || "");
        setMode(d.mode || "image");
        setImage(d.image || null);
        setScenario(d.scenario || "");
        setIntent(d.intent || "");
        setEnvironment(d.environment || "QA");
        setBrowser(d.browser || "");
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (bug && bugSectionRef.current) {
      bugSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [bug]);

  useEffect(() => {
    if (loading) document.body.classList.add("loading");
    else document.body.classList.remove("loading");
    return () => document.body.classList.remove("loading");
  }, [loading]);

  if (status === "loading" || (session && isBeta === null)) {
    return (
      <div className="container">
        <p>Loading your workspace...</p>
      </div>
    );
  }

  return (
    <div className="container">
      {/* HEADER */}
      <header
        className="header"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
      >
        <div>
          <h1>🐞 BugSnap AI</h1>
          <p>From screenshot, GIF or scenario to Jira-ready bug.</p>
        </div>

        <AuthButton />
      </header>

      {/* 🔒 LOGIN MESSAGE */}
      {!session && (
        <div
          style={{
            marginTop: 24,
            padding: "16px 20px",
            borderRadius: 12,
            background: "#fff7ed",
            border: "1px solid #fed7aa",
            color: "#9a3412",
            fontSize: 18,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          🔐 Please login with Google to generate bugs
        </div>
      )}

      {/* ❌ NOT APPROVED BETA */}
      {session && isBeta === false && (
        <div className="pro-card" style={{ marginTop: 40 }}>
          <h3>🔒 Private Beta</h3>
          <p>Your account is not approved for beta access yet.</p>
        </div>
      )}

      {/* ✅ MAIN APP (BETA OR PRO) */}
      {session && isBeta !== false && (
        <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
          {/* LEFT */}
          <div style={{ flex: 1 }}>
            <div className="cards">
              <div className="card">
                <div className="card-title">🧭 Bug Input Mode</div>
                <div style={{ display: "flex", gap: 16 }}>
                  <label>
                    <input
                      type="radio"
                      checked={mode === "image"}
                      onChange={() => setMode("image")}
                    />{" "}
                    📸 Screenshot
                  </label>

                  {isPro && (
                    <label>
                      <input
                        type="radio"
                        checked={mode === "gif"}
                        onChange={() => setMode("gif")}
                      />{" "}
                      🎞️ GIF
                    </label>
                  )}

                  <label>
                    <input
                      type="radio"
                      checked={mode === "scenario"}
                      onChange={() => setMode("scenario")}
                    />{" "}
                    📝 Scenario
                  </label>
                </div>
              </div>

              {(mode === "image" || mode === "gif") && (
                <div className="card">
                  <div className="card-title">
                    {mode === "gif" ? "🎞️ Upload GIF" : "📸 Upload Screenshot"}
                  </div>
                  <ScreenshotUploader image={image} setImage={setImage} mode={mode} />
                </div>
              )}

              {mode === "scenario" && (
                <div className="card">
                  <div className="card-title">📝 Scenario Description</div>

                  <textarea
                    rows={8}
                    value={scenario}
                    onChange={(e) => setScenario(e.target.value)}
                  />

                  {/* 🔢 CHARACTER COUNTER */}
                  <div style={{ marginTop: 8, fontSize: 13 }}>
                    {scenario.trim().length < MIN_SCENARIO_LENGTH ? (
                      <span style={{ color: "#dc2626" }}>
                        ⚠️ Minimum {MIN_SCENARIO_LENGTH} characters required (
                        {scenario.trim().length}/{MIN_SCENARIO_LENGTH})
                      </span>
                    ) : (
                      <span style={{ color: "#16a34a" }}>
                        ✅ Looks good ({scenario.trim().length} characters)
                      </span>
                    )}
                  </div>
                </div>
              )}

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

            {usage && usage.limit !== Infinity && (
              <p className="note">
                🧪 Bugs today: {usage.count} / {usage.limit}
              </p>
            )}

            <GenerateButton
              mode={mode}
              scenario={scenario}
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

            {showProMessage && (
              <div className="pro-card" style={{ marginTop: 16 }}>
                <h3>🚀 Upgrade to Pro</h3>
                <p>
                  You have reached your daily limit. Upgrade to Pro for unlimited
                  bugs and GIF support.
                </p>
              </div>
            )}
          </div>

          {/* RIGHT */}
          <div style={{ width: 340, position: "sticky", top: 20 }}>
            <BugHistory bugs={history} onSelect={(b) => setBug(b ? b.description : "")} />
          </div>
        </div>
      )}

      {loading && <LoadingSteps step={loadingStep} />}

      {/* BUG OUTPUT */}
      {bug && (
        <div ref={bugSectionRef} className="card">
          <div
            style={{
              display: "flex",
              gap: 12,
              marginBottom: 12,
              justifyContent: "flex-end",
            }}
          >
            <button className="secondary" onClick={resetForm}>
              🆕 New Bug
            </button>

            {isPro && (
              <button className="primary" onClick={() => setShowJiraModal(true)}>
                🚀 Push to Jira
              </button>
            )}
          </div>

          <BugEditor bug={bug} image={image} />
        </div>
      )}

      <JiraPushModal
        open={showJiraModal}
        onClose={() => setShowJiraModal(false)}
        title={bug.match(/Title:\s*(.*)/i)?.[1] || "Bug from BugSnap AI"}
        description={bug}
        severity={bug.match(/Severity:\s*(.*)/i)?.[1] || ""}
        image={image}
        onAuthExpired={() => {}}
      />
    </div>
  );
}
