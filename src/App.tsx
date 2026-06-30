import { useState, useRef, useCallback, useEffect } from "react";
import {
  runWorkflow,
  getDefaultConfig,
  saveConfig,
  type DifyConfig,
  type WorkflowRunEvent,
} from "./services/dify";
import SessionSidebar from "./components/SessionSidebar";
import SessionPanel from "./components/SessionPanel";
import SettingsModal from "./components/SettingsModal";
import "./App.css";

interface Step {
  id: string;
  title: string;
  status: "running" | "finished" | "error";
  output?: string;
}

type AppStatus = "idle" | "running" | "done" | "error";

interface Session {
  id: string;
  query: string;
  steps: Step[];
  resultText: string;
  status: AppStatus;
  error: string;
  createdAt: number;
}

const SESSIONS_KEY = "dify_sessions";
const ACTIVE_KEY = "dify_active_session";

function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function makeSession(query = ""): Session {
  return {
    id: newId(),
    query,
    steps: [],
    resultText: "",
    status: "idle",
    error: "",
    createdAt: Date.now(),
  };
}

function loadSessions(): Session[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    return raw ? (JSON.parse(raw) as Session[]) : [];
  } catch {
    return [];
  }
}

function persistSessions(sessions: Session[]) {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

function extractLongestText(obj: Record<string, unknown> | undefined): string {
  if (!obj) return "";
  let best = "";
  for (const v of Object.values(obj)) {
    if (typeof v === "string" && v.length > best.length) best = v;
  }
  return best;
}

export default function App() {
  const [config, setConfig] = useState<DifyConfig>(() => getDefaultConfig());
  const [showSettings, setShowSettings] = useState(() => !getDefaultConfig().apiKey);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [sessions, setSessions] = useState<Session[]>(() => loadSessions());
  const [activeId, setActiveId] = useState<string>(() => {
    const saved = localStorage.getItem(ACTIVE_KEY);
    const loaded = loadSessions();
    if (loaded.length === 0) return "";
    if (saved && loaded.some((s) => s.id === saved)) return saved;
    return loaded[0].id;
  });

  const abortRef = useRef<AbortController | null>(null);
  const collectedRef = useRef<string[]>([]);
  const doneRef = useRef(false);
  const activeIdRef = useRef(activeId);

  useEffect(() => {
    activeIdRef.current = activeId;
    localStorage.setItem(ACTIVE_KEY, activeId);
  }, [activeId]);

  const activeSession = sessions.find((s) => s.id === activeId) ?? null;

  const updateSession = useCallback(
    (id: string, patch: Partial<Session>) => {
      setSessions((prev) => {
        const next = prev.map((s) => (s.id === id ? { ...s, ...patch } : s));
        persistSessions(next);
        return next;
      });
    },
    []
  );

  const handleEvent = useCallback(
    (event: WorkflowRunEvent, sessionId: string) => {
      const d = event.data;
      switch (event.event) {
        case "node_started": {
          const id = (d.node_id ?? "") as string;
          const title = (d.title ?? id) as string;
          setSessions((prev) => {
            const next = prev.map((s) => {
              if (s.id !== sessionId) return s;
              if (s.steps.some((st) => st.id === id)) return s;
              return { ...s, steps: [...s.steps, { id, title, status: "running" }] };
            });
            persistSessions(next);
            return next;
          });
          break;
        }
        case "node_finished": {
          const id = (d.node_id ?? "") as string;
          const outputs = (d.outputs ?? {}) as Record<string, unknown>;
          const output = extractLongestText(outputs);
          const failed = d.status === "failed";
          setSessions((prev) => {
            const next = prev.map((s) => {
              if (s.id !== sessionId) return s;
              return {
                ...s,
                steps: s.steps.map((st) =>
                  st.id === id ? { ...st, status: failed ? ("error" as const) : ("finished" as const), output } : st
                ),
              };
            });
            persistSessions(next);
            return next;
          });
          if (!failed && output.length > 20) {
            collectedRef.current.push(output);
          }
          break;
        }
        case "text_chunk": {
          const text = (d.text ?? "") as string;
          setSessions((prev) => {
            const next = prev.map((s) =>
              s.id === sessionId ? { ...s, resultText: s.resultText + text } : s
            );
            persistSessions(next);
            return next;
          });
          break;
        }
        case "workflow_finished": {
          const outputs = (d.outputs ?? {}) as Record<string, unknown>;
          const finalText = extractLongestText(outputs);
          setSessions((prev) => {
            const next = prev.map((s) => {
              if (s.id !== sessionId) return s;
              let result = s.resultText;
              if (result.length <= 20) {
                result =
                  finalText.length > 20
                    ? finalText
                    : collectedRef.current.reduce((a, b) => (a.length >= b.length ? a : b), "");
              }
              return { ...s, resultText: result, status: "done" as AppStatus };
            });
            persistSessions(next);
            return next;
          });
          doneRef.current = true;
          break;
        }
        case "error": {
          const msg = (d.message ?? "Unknown error") as string;
          updateSession(sessionId, { error: msg, status: "error" });
          doneRef.current = true;
          break;
        }
      }
    },
    [updateSession]
  );

  const handleSubmit = async (query: string) => {
    const sid = activeIdRef.current;
    updateSession(sid, { query, steps: [], resultText: "", error: "", status: "running" });
    collectedRef.current = [];
    doneRef.current = false;

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await runWorkflow(
        query,
        (evt) => handleEvent(evt, sid),
        controller.signal,
        config
      );
      if (!doneRef.current) {
        setSessions((prev) => {
          const next = prev.map((s) => {
            if (s.id !== sid) return s;
            let result = s.resultText;
            if (result.length <= 20) {
              result = collectedRef.current.reduce((a, b) => (a.length >= b.length ? a : b), "");
            }
            return { ...s, resultText: result, status: "done" as AppStatus };
          });
          persistSessions(next);
          return next;
        });
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        updateSession(sid, { status: "done" });
        return;
      }
      const msg = err instanceof Error ? err.message : String(err);
      updateSession(sid, { error: msg, status: "error" });
    }
  };

  const handleCancel = () => {
    abortRef.current?.abort();
    updateSession(activeIdRef.current, { status: "done" });
  };

  const handleNewSession = () => {
    const s = makeSession();
    setSessions((prev) => {
      const next = [s, ...prev];
      persistSessions(next);
      return next;
    });
    setActiveId(s.id);
  };

  const handleDeleteSession = (id: string) => {
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id);
      persistSessions(next);
      if (id === activeIdRef.current && next.length > 0) {
        setActiveId(next[0].id);
      }
      return next;
    });
  };

  const handleSelectSession = (id: string) => {
    setActiveId(id);
  };

  const handleSaveConfig = (newConfig: DifyConfig) => {
    setConfig(newConfig);
    saveConfig(newConfig);
    setShowSettings(false);
  };

  const sessionList = sessions.map((s) => ({
    id: s.id,
    title: s.query
      ? s.query.slice(0, 30) + (s.query.length > 30 ? "…" : "")
      : "新研究",
    status: s.status,
    createdAt: s.createdAt,
  }));

  // Auto-create a first session if none exist
  useEffect(() => {
    setSessions((prev) => {
      if (prev.length > 0) return prev;
      const s = makeSession();
      setActiveId(s.id);
      persistSessions([s]);
      return [s];
    });
  }, []);

  return (
    <div className={`app-layout ${sidebarOpen ? "" : "sidebar-closed"}`}>
      <aside className={`sidebar-wrapper ${sidebarOpen ? "open" : "closed"}`}>
        <SessionSidebar
          sessions={sessionList}
          activeId={activeId}
          onSelect={handleSelectSession}
          onNew={handleNewSession}
          onDelete={handleDeleteSession}
        />
      </aside>

      <div className="main-area">
        <header className="app-header">
          <div className="header-left">
            <button
              className="btn-icon sidebar-toggle"
              onClick={() => setSidebarOpen((v) => !v)}
              title={sidebarOpen ? "收起侧栏" : "展开侧栏"}
            >
              ☰
            </button>
            <div className="header-titles">
              <h1>🔍 深度研究 AI 工具</h1>
              <p className="subtitle">输入问题，AI 将自动搜索、分析并生成深度研究报告</p>
            </div>
          </div>
          <button className="btn-icon" onClick={() => setShowSettings(true)} title="设置">
            ⚙️
          </button>
        </header>

        {!config.apiKey && (
          <div className="warning-banner">
            ⚠️ 尚未配置 API Key，请点击右上角 ⚙️ 设置
          </div>
        )}

        <main className="app-main">
          {activeSession ? (
            <SessionPanel
              query={activeSession.query}
              steps={activeSession.steps}
              resultText={activeSession.resultText}
              status={activeSession.status}
              error={activeSession.error}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
            />
          ) : (
            <div className="result-empty">
              <div className="empty-icon">🔬</div>
              <p>点击「+ 新研究」开始</p>
            </div>
          )}
        </main>
      </div>

      {showSettings && (
        <SettingsModal
          config={config}
          onSave={handleSaveConfig}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
