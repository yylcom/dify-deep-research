import { useState, type FormEvent } from "react";

interface Props {
  onSubmit: (query: string) => void;
  loading: boolean;
  onCancel: () => void;
}

export default function ResearchInput({ onSubmit, loading, onCancel }: Props) {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) onSubmit(trimmed);
  };

  return (
    <form className="research-input" onSubmit={handleSubmit}>
      <textarea
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="输入你想要深度研究的问题，例如：2024年AI领域的最新突破有哪些？"
        rows={4}
        maxLength={4000}
        disabled={loading}
      />
      <div className="input-footer">
        <span className="char-count">{query.length} / 4000</span>
        {loading ? (
          <button type="button" className="btn btn-cancel" onClick={onCancel}>
            停止
          </button>
        ) : (
          <button type="submit" className="btn btn-submit" disabled={!query.trim()}>
            开始研究
          </button>
        )}
      </div>
    </form>
  );
}
