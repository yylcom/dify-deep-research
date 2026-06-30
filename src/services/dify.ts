const BASE_URL = import.meta.env.VITE_DIFY_BASE_URL || "https://api.dify.ai/v1";
const API_KEY = import.meta.env.VITE_DIFY_API_KEY || "";

export interface WorkflowRunEvent {
  event:
    | "workflow_started"
    | "node_started"
    | "node_finished"
    | "text_chunk"
    | "workflow_finished"
    | "iteration_started"
    | "iteration_next"
    | "iteration_completed"
    | "error";
  data: Record<string, unknown>;
}

export async function runWorkflow(
  query: string,
  onEvent: (event: WorkflowRunEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  const res = await fetch(`${BASE_URL}/workflows/run`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: { user_query: query },
      response_mode: "streaming",
      user: "react-app-user",
    }),
    signal,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`API error ${res.status}: ${errText}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  function processLines(lines: string[]) {
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("event:")) continue;
      if (!trimmed.startsWith("data:")) continue;
      const jsonStr = trimmed.startsWith("data: ") ? trimmed.slice(6) : trimmed.slice(5);
      try {
        const parsed = JSON.parse(jsonStr) as WorkflowRunEvent;
        onEvent(parsed);
      } catch {
        // skip malformed chunks
      }
    }
  }

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n");
    buffer = parts.pop() ?? "";
    processLines(parts);
  }

  // Process remaining buffer (last event may lack trailing newline)
  buffer += decoder.decode();
  processLines(buffer.split("\n"));
}
