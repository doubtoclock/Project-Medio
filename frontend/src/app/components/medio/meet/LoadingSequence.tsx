import { Loading } from "../../design/Loading";

interface LoadingSequenceProps {
  stage: number;
}

const STAGES = [
  { label: "Finding optimal midpoint...", detail: "Analyzing geographic center between both locations" },
  { label: "Calculating travel routes...", detail: "Evaluating public transport and road networks" },
  { label: "Searching nearby places...", detail: "Scanning for cafes, parks, restaurants and more" },
  { label: "Ranking recommendations...", detail: "Sorting by travel balance, category, and relevance" },
  { label: "Revealing results", detail: "Preparing your personalized meeting spots" },
];

export function LoadingSequence({ stage }: LoadingSequenceProps) {
  const current = STAGES[Math.min(stage, STAGES.length - 1)];

  return (
    <div
      className="fixed inset-0 z-[var(--ds-z-modal)] flex items-center justify-center"
      style={{
        backgroundColor: "var(--ds-overlay)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div
        className="ds-glass-strong flex flex-col items-center gap-5 px-10 py-9 rounded-[var(--ds-radius-2xl)]"
        style={{ boxShadow: "var(--ds-shadow-2xl)" }}
      >
        <Loading size="lg" />
        <div className="flex flex-col items-center gap-1">
          <p
            className="text-sm font-[var(--ds-weight-medium)]"
            style={{ color: "var(--ds-text-primary)" }}
          >
            {current.label}
          </p>
          <p
            className="text-xs"
            style={{ color: "var(--ds-text-tertiary)" }}
          >
            {current.detail}
          </p>
        </div>
      </div>
    </div>
  );
}
