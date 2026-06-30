import ResearchInput from "./ResearchInput";
import ResearchResult from "./ResearchResult";

interface Step {
  id: string;
  title: string;
  status: "running" | "finished" | "error";
  output?: string;
}

type AppStatus = "idle" | "running" | "done" | "error";

interface Props {
  query: string;
  steps: Step[];
  resultText: string;
  status: AppStatus;
  error: string;
  onSubmit: (query: string) => void;
  onCancel: () => void;
}

export default function SessionPanel({ query, steps, resultText, status, error, onSubmit, onCancel }: Props) {
  return (
    <div className="session-panel">
      <ResearchInput
        onSubmit={onSubmit}
        loading={status === "running"}
        onCancel={onCancel}
        initialQuery={query}
      />
      <ResearchResult steps={steps} resultText={resultText} status={status} error={error} />
    </div>
  );
}
