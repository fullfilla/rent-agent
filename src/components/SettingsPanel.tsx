import { RefreshCw, Save, Settings } from "lucide-react";
import { ModelConfig } from "../lib/types";

interface SettingsPanelProps {
  config: ModelConfig;
  autoRefresh: boolean;
  lastRefreshAt: string;
  isRefreshing: boolean;
  onConfigChange: (config: ModelConfig) => void;
  onSaveConfig: () => void;
  onRefresh: () => void;
  onAutoRefreshChange: (value: boolean) => void;
}

export function SettingsPanel({
  config,
  autoRefresh,
  lastRefreshAt,
  isRefreshing,
  onConfigChange,
  onSaveConfig,
  onRefresh,
  onAutoRefreshChange,
}: SettingsPanelProps) {
  const updateModel = <K extends keyof ModelConfig>(key: K, value: ModelConfig[K]) => {
    onConfigChange({ ...config, [key]: value });
  };

  return (
    <section className="settings-panel">
      <div className="panel-heading compact">
        <div>
          <p className="kicker">本地设置</p>
          <h2>大模型 API</h2>
        </div>
        <Settings size={18} />
      </div>

      <div className="refresh-box">
        <button className="secondary-button" type="button" onClick={onRefresh} disabled={isRefreshing}>
          <RefreshCw size={16} className={isRefreshing ? "spin" : ""} />
          {isRefreshing ? "刷新中" : "手动刷新"}
        </button>
        <label className="switch-line">
          <input type="checkbox" checked={autoRefresh} onChange={(event) => onAutoRefreshChange(event.target.checked)} />
          每 30 秒自动刷新
        </label>
        <p>上次刷新：{lastRefreshAt ? new Date(lastRefreshAt).toLocaleTimeString() : "尚未刷新"}</p>
      </div>

      <div className="settings-block">
        <div className="settings-block-title">
          <Settings size={16} />
          <strong>用户侧大模型配置</strong>
        </div>
        <p className="settings-hint">这里用于配置用户自己的 OpenAI 兼容模型。房源平台 API 不放在前台页面，部署上线后由服务端环境变量统一配置。</p>
        <div className="config-form">
          <label className="field">
            供应商名称
            <input value={config.providerName} onChange={(event) => updateModel("providerName", event.target.value)} />
          </label>
          <label className="field">
            Base URL
            <input placeholder="https://api.example.com/v1" value={config.baseUrl} onChange={(event) => updateModel("baseUrl", event.target.value)} />
          </label>
          <label className="field">
            模型名称
            <input placeholder="gpt-4.1-mini" value={config.modelName} onChange={(event) => updateModel("modelName", event.target.value)} />
          </label>
          <label className="field">
            API Key
            <input type="password" placeholder="只保存在本机浏览器" value={config.apiKey} onChange={(event) => updateModel("apiKey", event.target.value)} />
          </label>
        </div>
      </div>

      <button className="secondary-button full" type="button" onClick={onSaveConfig}>
        <Save size={16} />
        保存模型配置
      </button>
    </section>
  );
}
