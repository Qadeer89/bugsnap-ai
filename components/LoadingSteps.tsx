type Props = {
  step: number;
};

export default function LoadingSteps({ step }: Props) {
  const steps = [
    "Analyzing screenshot",
    "Applying QA rules",
    "Writing Jira-ready bug",
  ];

  const progressPercent = Math.min(((step + 1) / steps.length) * 100, 100);

  return (
    <div className="overlay">
      <div className="overlay-box">
        <div className="loading-box premium">
          <h3 className="loading-title">🤖 BugSnap is working</h3>

          <p className="loading-sub">
            You can continue preparing your next bug. This usually takes ~10 seconds.
          </p>

          {/* Progress bar */}
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Steps timeline */}
          <div className="timeline">
            {steps.map((text, index) => {
              const isDone = step > index;
              const isActive = step === index;

              return (
                <div
                  key={index}
                  className={`timeline-step ${
                    isDone ? "done" : isActive ? "active" : ""
                  }`}
                >
                  <div className="dot">
                    {isDone ? "✅" : isActive ? "⏳" : "⬜"}
                  </div>
                  <div className="label">{text}</div>
                </div>
              );
            })}
          </div>

          <p className="loading-footer">
            ⚡ Optimizing result quality… please don’t refresh
          </p>
        </div>
      </div>
    </div>
  );
}
