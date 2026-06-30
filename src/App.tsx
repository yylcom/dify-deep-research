import { useState, useRef, useCallback } from "react";
import { runWorkflow, type WorkflowRunEvent } from "./services/dify";
import ResearchInput from "./components/ResearchInput";
import ResearchResult from "./components/ResearchResult";
import "./App.css";

interface Step {
  id: string;
  title: string;
  status: "running" | "finished" | "error";
  output?: string;
}

type AppStatus = "idle" | "running" | "done" | "error";

/** Pick the longest meaningful string from an outputs object */
function extractLongestText(obj: Record<string, unknown> | undefined): string {
  if (!obj) return "";
  let best = "";
  for (const v of Object.values(obj)) {
    if (typeof v === "string" && v.length > best.length) best = v;
  }
  return best;
}

export default function App() {
  const [status, setStatus] = useState<AppStatus>("idle");
  const [steps, setSteps] = useState<Step[]>([]);
  const [resultText, setResultText] = useState("");
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const collectedRef = useRef<string[]>([]);
  const doneRef = useRef(false);

  const handleEvent = useCallback((event: WorkflowRunEvent) => {
    const d = event.data;
    switch (event.event) {
      case "node_started": {
        const id = (d.node_id ?? "") as string;
        const title = (d.title ?? id) as string;
        setSteps((prev) => {
          if (prev.some((s) => s.id === id)) return prev;
          return [...prev, { id, title, status: "running" }];
        });
        break;
      }
      case "node_finished": {
        const id = (d.node_id ?? "") as string;
        const outputs = (d.outputs ?? {}) as Record<string, unknown>;
        const output = extractLongestText(outputs);
        const failed = d.status === "failed";
        setSteps((prev) =>
          prev.map((s) =>
            s.id === id
              ? { ...s, status: failed ? "error" : "finished", output }
              : s
          )
        );
        // Collect any node output that looks like report content
        if (!failed && output.length > 20) {
          collectedRef.current.push(output);
        }
        break;
      }
      case "text_chunk": {
        const text = (d.text ?? "") as string;
        setResultText((prev) => prev + text);
        break;
      }
      case "workflow_finished": {
        const outputs = (d.outputs ?? {}) as Record<string, unknown>;
        const finalText = extractLongestText(outputs);
        // Use streamed text_chunks if they exist, otherwise use workflow output,
        // otherwise use the longest collected node output
        setResultText((prev) => {
          if (prev.length > 20) return prev;
          if (finalText.length > 20) return finalText;
          const longest = collectedRef.current.reduce((a, b) => a.length >= b.length ? a : b, "");
          return longest;
        });
        setStatus("done");
        doneRef.current = true;
        break;
      }
      case "error": {
        setError((d.message ?? "Unknown error") as string);
        setStatus("error");
        doneRef.current = true;
        break;
      }
    }
  }, []);

  const handleSubmit = async (query: string) => {
    setStatus("running");
    setSteps([]);
    setResultText("");
    setError("");
    collectedRef.current = [];
    doneRef.current = false;

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await runWorkflow(query, handleEvent, controller.signal);
      // If workflow_finished never fired (e.g. stream ended without it)
      if (!doneRef.current) {
        setResultText((prev) => {
          if (prev.length > 20) return prev;
          const longest = collectedRef.current.reduce((a, b) => a.length >= b.length ? a : b, "");
          return longest;
        });
        setStatus("done");
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setStatus("done");
        return;
      }
      setError(err instanceof Error ? err.message : String(err));
      setStatus("error");
    }
  };

  const handleCancel = () => {
    abortRef.current?.abort();
    setStatus("done");
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>🔍 深度研究 AI 工具</h1>
        <p className="subtitle">输入问题，AI 将自动搜索、分析并生成深度研究报告</p>
      </header>

      <main className="app-main">
        <ResearchInput onSubmit={handleSubmit} loading={status === "running"} onCancel={handleCancel} />
        <ResearchResult steps={steps} resultText={resultText} status={status} error={error} />
      </main>
    </div>
  );
}
