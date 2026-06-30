interface SessionInfo {
  id: string;
  title: string;
  status: string;
  createdAt: number;
}

interface Props {
  sessions: SessionInfo[];
  activeId: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}

function statusIcon(status: string): string {
  switch (status) {
    case "running":
      return "⏳";
    case "done":
      return "✅";
    case "error":
      return "❌";
    default:
      return "💬";
  }
}

export default function SessionSidebar({ sessions, activeId, onSelect, onNew, onDelete }: Props) {
  return (
    <aside className="session-sidebar">
      <div className="sidebar-header">
        <h2>研究会话</h2>
        <button className="btn btn-new" onClick={onNew}>
          + 新研究
        </button>
      </div>
      <ul className="session-list">
        {sessions.length === 0 && (
          <li className="session-empty">暂无会话</li>
        )}
        {sessions.map((s) => (
          <li
            key={s.id}
            className={`session-item ${s.id === activeId ? "active" : ""}`}
            onClick={() => onSelect(s.id)}
          >
            <span className="session-icon">{statusIcon(s.status)}</span>
            <span className="session-title" title={s.title}>
              {s.title}
            </span>
            <button
              className="session-delete"
              title="删除"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(s.id);
              }}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
