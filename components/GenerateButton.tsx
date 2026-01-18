import type { Dispatch, SetStateAction } from "react";

type Mode = "image" | "gif" | "scenario";

type Props = {
  mode: Mode;
  image: string | null;
  scenario: string;

  intent: string;
  environment: string;
  browser: string;

  setBug: (v: string) => void;
  loading: boolean;
  setLoading: (v: boolean) => void;
  setLoadingStep: Dispatch<SetStateAction<number>>;
  onLimitReached: () => void;
  onGenerated: () => void;
};

const MIN_SCENARIO_LENGTH = 10;

export default function GenerateButton(props: Props) {
  async function generate() {
    if (props.loading) return;

    // 🧠 Validation per mode (NO ALERTS — UI handles messaging)
    if (props.mode === "scenario") {
      if (!props.scenario || props.scenario.trim().length < MIN_SCENARIO_LENGTH) {
        return;
      }
    } else {
      if (!props.image) {
        return;
      }
    }

    props.setLoading(true);
    props.setLoadingStep(1);

    try {
      const res = await fetch("/api/generate-bug", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: props.mode,
          image: props.image,
          scenario: props.scenario,
          intent: props.intent,
          environment: props.environment,
          browser: props.browser,
        }),
      });

      const data = await res.json();

      // 🚫 LIMIT HIT (SERVER CONTROLLED)
      if (data?.error === "LIMIT_REACHED") {
        props.onLimitReached(); // 🔥 THIS should open Pro modal/card
        props.setLoading(false);
        props.setLoadingStep(0);
        return;
      }

      if (!res.ok) {
        throw new Error("API failed");
      }

      props.setLoadingStep(2);
      props.setBug(data.result);
      props.onGenerated();

      // smooth UX delay
      setTimeout(() => {
        props.setLoading(false);
        props.setLoadingStep(0);
      }, 800);
    } catch (error) {
      console.error("Error generating bug:", error);
      props.setLoading(false);
      props.setLoadingStep(0);
    }
  }

  const scenarioTooShort =
    props.mode === "scenario" &&
    (!props.scenario || props.scenario.trim().length < MIN_SCENARIO_LENGTH);

  const disabled =
    props.loading ||
    (props.mode === "scenario"
      ? scenarioTooShort
      : !props.image);

  return (
    <button
      className="primary"
      disabled={disabled}
      onClick={generate}
    >
      {props.loading ? "Generating..." : "Generate Bug"}
    </button>
  );
}
