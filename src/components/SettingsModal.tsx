import { useState } from "react";
import type { DifyConfig } from "../services/dify";

interface Props {
  config: DifyConfig;
  onSave: (config: DifyConfig) => void;
  onClose: () => void;
}

export default function SettingsModal({ config, onSave, onClose }: Props) {
  const [baseUrl, setBaseUrl] = useState(config.baseUrl);
  const [apiKey, setApiKey] = useState(config.apiKey);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      baseUrl: baseUrl.trim() || "https://api.dify.ai/v1",
      apiKey: apiKey.trim(),
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>⚙️ 设置</h2>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="baseUrl">API Base URL</label>
            <input
              id="baseUrl"
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.dify.ai/v1"
            />
            <span className="form-hint">Dify API 的基础地址</span>
          </div>
          <div className="form-group">
            <label htmlFor="apiKey">API Key</label>
            <input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="app-xxxxxxxx"
            />
            <span className="form-hint">应用的 API 密钥</span>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-cancel" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn btn-submit">
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
