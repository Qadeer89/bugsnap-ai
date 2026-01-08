import type { Dispatch, SetStateAction } from "react";

type Props = {
  image: string | null;
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

export default function GenerateButton(props: Props) {
  async function generate() {
    if (!props.image || props.loading) return;

    props.setLoading(true);
    props.setLoadingStep(1);

    try {
      const res = await fetch("/api/generate-bug", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: props.image,
          intent: props.intent,
          environment: props.environment,
          browser: props.browser,
        }),
      });

      // 🔒 LIMIT HIT (SERVER DECIDES)
      if (res.status === 403) {
        props.onLimitReached();
        props.setLoading(false);
        props.setLoadingStep(0);
        return;
      }

      if (!res.ok) {
        throw new Error("API failed");
      }

      const data = await res.json();

      props.setLoadingStep(2);
      props.setBug(data.result);
      props.onGenerated();

      // small UX delay for smooth transition
      setTimeout(() => {
        props.setLoading(false);
        props.setLoadingStep(0);
      }, 800);

    } catch (error) {
      console.error("Error generating bug:", error);
      alert("Failed to generate bug");
      props.setLoading(false);
      props.setLoadingStep(0);
    }
  }

  return (
    <button
      className="primary"
      disabled={!props.image || props.loading}
      onClick={generate}
    >
      {props.loading ? "Generating..." : "Generate Bug"}
    </button>
  );
}
