export interface Step {
  id: string;
  title: string;
  status: "running" | "finished" | "error";
  output?: string;
}

export type AppStatus = "idle" | "running" | "done" | "error";

export interface Session {
  id: string;
  query: string;
  steps: Step[];
  resultText: string;
  status: AppStatus;
  error: string;
  createdAt: number;
}
