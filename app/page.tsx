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
import ActionBar from "@/components/ActionBar";

type Mode = "image" | "gif" | "scenario";

type Bug = {
  id: number;
  title: string;
  description: string;
  created_at: string;
  is_pinned: number;
};

const DRAFT_KEY = "bugsnap_draft_v1";
const MIN_SCENARIO_LENGTH = 10;
const PAGE_SIZE = 10;
const LEMON_CHECKOUT_URL ="https://bugsnap-ai.lemonsqueezy.com/checkout/buy/7b9ae934-2c86-48fb-a92c-ef24cb3e2bc9";


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
  const [history, setHistory] = useState<Bug[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [isBeta, setIsBeta] = useState<boolean | null>(null);
  const [isPro, setIsPro] = useState<boolean>(false);
  const [showProMessage, setShowProMessage] = useState(false);
  const [showJiraModal, setShowJiraModal] = useState(false);
  const [search, setSearch] = useState("");


  const bugSectionRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<HTMLDivElement | null>(null);
  const historyContainerRef = useRef<HTMLDivElement | null>(null);

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

  async function loadHistory(pageToLoad = 1, append = false) {
    try {
      setLoadingHistory(true);

      const res = await fetch(
        `/api/history?page=${pageToLoad}&pageSize=${PAGE_SIZE}`,
        { cache: "no-store" }
      );

      if (!res.ok) return;

      const data = await res.json();

      if (append) {
        setHistory((prev) => [...prev, ...data.items]);
      } else {
        setHistory(data.items);
      }

      setPage(pageToLoad);
      setHasMore(data.hasMore);
    } finally {
      setLoadingHistory(false);
    }
  }

  async function reloadFirstPage() {
    await loadHistory(1, false);
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
      loadHistory(1, false);
      checkUser();
    }
  }, [session]);

  // Save draft
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

  // Restore draft
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

  // Scroll to bug output
  useEffect(() => {
    if (bug && bugSectionRef.current) {
      bugSectionRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [bug]);

  useEffect(() => {
    if (loading) document.body.classList.add("loading");
    else document.body.classList.remove("loading");
    return () => document.body.classList.remove("loading");
  }, [loading]);

  // ✅ FIXED INFINITE SCROLL (no auto-calls)
  useEffect(() => {
    if (!observerRef.current || !historyContainerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];

        if (
          target.isIntersecting &&
          hasMore &&
          !loadingHistory &&
          history.length >= PAGE_SIZE
        ) {
          loadHistory(page + 1, true);
        }
      },
      {
        root: historyContainerRef.current,
        threshold: 0.2,
      }
    );

    observer.observe(observerRef.current);

    return () => observer.disconnect();
  }, [hasMore, loadingHistory, page]); // 🔥 removed history.length to stop auto-calls

  async function handlePushToJira() {
    if (!isPro) return;

    const res = await fetch("/api/jira/status");
    const data = await res.json();

    if (!data.connected) {
      window.location.href = "/api/jira/connect";
      return;
    }

    setShowJiraModal(true);
  }

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
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto auto",
          alignItems: "center",
          gap: 24,
          paddingBottom: 16,
        }}
      >
        <div>
          <h1>🐞 BugSnap AI</h1>
          <p>From screenshot, GIF or scenario to Jira-ready bug.</p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {isPro && <ActionBar />}
          <AuthButton />
        </div>
      </header>

      {/* MAIN APP */}
      {session && isBeta !== false && (
        <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
          {/* LEFT SIDE */}
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
                    {mode === "gif"
                      ? "🎞️ Upload GIF"
                      : "📸 Upload Screenshot"}
                  </div>
                  <ScreenshotUploader
                    image={image}
                    setImage={setImage}
                    mode={mode}
                  />
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
              image={mode === "scenario" ? null : image}
              intent={intent}
              environment={environment}
              browser={browser}
              setBug={setBug}
              loading={loading}
              setLoading={setLoading}
              setLoadingStep={setLoadingStep}
              onGenerated={() => {
                refreshUsage();
                loadHistory(1, false); // refresh history after new bug
              }}
              onLimitReached={() => setShowProMessage(true)}
            />

            {showProMessage && (
              <div className="pro-card" style={{ marginTop: 16 }}>
                <h3>🚀 Upgrade to Pro</h3>
                <p>
                  You have reached your daily limit. Upgrade to Pro for
                  unlimited bugs, GIF support and Jira Integration.
                </p>
                <button onClick={() => window.open(LEMON_CHECKOUT_URL, "_blank")} className="upgrade-btn">Upgrade to Pro →</button>
              </div>
            )}
          </div>

          {/* RIGHT SIDE — HISTORY (INFINITE SCROLL) */}
          <div
            ref={historyContainerRef}
            style={{
              width: 340,
              position: "sticky",
              top: 20,
              maxHeight: 500,
              overflowY: "auto",
            }}
          >
            <BugHistory
              bugs={history}
              search={search}
              setSearch={setSearch}
              onSelect={(b) => setBug(b ? b.description : "")}
              setHistory={setHistory}
              reloadFirstPage={() => loadHistory(1, false)}
            />


            <div ref={observerRef} style={{ height: 1 }} />

            {loadingHistory && (
              <p style={{ textAlign: "center", fontSize: 12 }}>
                Loading more...
              </p>
            )}
          </div>
        </div>
      )}

      {loading && <LoadingSteps step={loadingStep} />}

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
              <button className="primary" onClick={handlePushToJira}>
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
