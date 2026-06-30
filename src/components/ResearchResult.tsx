import { useMemo } from "react";
import MarkdownRenderer from "./MarkdownRenderer";

interface Step {
  id: string;
  title: string;
  status: "running" | "finished" | "error";
  output?: string;
}

interface Props {
  steps: Step[];
  resultText: string;
  status: "idle" | "running" | "done" | "error";
  error?: string;
}

export default function ResearchResult({ steps, resultText, status, error }: Props) {
  const reversedSteps = useMemo(() => [...steps].reverse(), [steps]);

  if (status === "idle") {
    return (
      <div className="result-empty">
        <div className="empty-icon">🔬</div>
        <p>输入研究问题，AI 将为你进行深度研究</p>
      </div>
    );
  }

  return (
    <div className="research-result">
      {reversedSteps.length > 0 && (
        <div className="steps-panel">
          <h3>研究步骤</h3>
          <ul className="steps-list">
            {reversedSteps.map((s) => (
              <li key={s.id} className={`step step-${s.status}`}>
                <span className="step-icon">
                  {s.status === "running" ? "⏳" : s.status === "finished" ? "✅" : "❌"}
                </span>
                <span className="step-title">{s.title}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {status === "running" && !resultText && (
        <div className="thinking-indicator">
          <div className="dot-pulse" />
          <span>AI 正在研究中...</span>
        </div>
      )}

      {resultText && (
        <div className="result-content">
          <h3>研究结果</h3>
          <div className="markdown-body">
            <MarkdownRenderer content={resultText} />
          </div>
        </div>
      )}

      {status === "error" && error && (
        <div className="error-box">
          <strong>出错了：</strong> {error}
        </div>
      )}

      {status === "done" && (
        <div className="done-banner">✅ 研究完成</div>
      )}
    </div>
  );
}
