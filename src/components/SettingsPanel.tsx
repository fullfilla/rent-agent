import { RefreshCw, Save, Settings, Wifi } from "lucide-react";
import { ListingApiConfig, ListingApiProviderConfig, ListingApiProviderKey, ListingApiTestResult, ModelConfig } from "../lib/types";

const providerKeys: ListingApiProviderKey[] = ["beike", "anjuke", "wuba"];

interface SettingsPanelProps {
  config: ModelConfig;
  listingApiConfig: ListingApiConfig;
  apiTestResults: ListingApiTestResult[];
  autoRefresh: boolean;
  lastRefreshAt: string;
  isRefreshing: boolean;
  isTestingApi: boolean;
  onConfigChange: (config: ModelConfig) => void;
  onListingApiConfigChange: (config: ListingApiConfig) => void;
  onSaveConfig: () => void;
  onRefresh: () => void;
  onTestApi: () => void;
  onAutoRefreshChange: (value: boolean) => void;
}

export function SettingsPanel({
  config,
  listingApiConfig,
  apiTestResults,
  autoRefresh,
  lastRefreshAt,
  isRefreshing,
  isTestingApi,
  onConfigChange,
  onListingApiConfigChange,
  onSaveConfig,
  onRefresh,
  onTestApi,
  onAutoRefreshChange,
}: SettingsPanelProps) {
  const updateModel = <K extends keyof ModelConfig>(key: K, value: ModelConfig[K]) => {
    onConfigChange({ ...config, [key]: value });
  };

  const updateProvider = <K extends keyof ListingApiProviderConfig>(providerKey: ListingApiProviderKey, key: K, value: ListingApiProviderConfig[K]) => {
    onListingApiConfigChange({
      ...listingApiConfig,
      [providerKey]: {
        ...listingApiConfig[providerKey],
        [key]: value,
      },
    });
  };

  const enabledCount = providerKeys.filter((key) => listingApiConfig[key].enabled && listingApiConfig[key].baseUrl && listingApiConfig[key].accessToken).length;

  return (
    <section className="settings-panel">
      <div className="panel-heading compact">
        <div>
          <p className="kicker">Local settings</p>
          <h2>API settings</h2>
        </div>
        <Settings size={18} />
      </div>

      <div className="refresh-box">
        <button className="secondary-button" type="button" onClick={onRefresh} disabled={isRefreshing}>
          <RefreshCw size={16} className={isRefreshing ? "spin" : ""} />
          {isRefreshing ? "Refreshing" : "Refresh listings"}
        </button>
        <label className="switch-line">
          <input type="checkbox" checked={autoRefresh} onChange={(event) => onAutoRefreshChange(event.target.checked)} />
          Auto refresh every 30 seconds
        </label>
        <p>Last refresh: {lastRefreshAt ? new Date(lastRefreshAt).toLocaleTimeString() : "never"}</p>
      </div>

      <div className="settings-block">
        <div className="settings-block-title">
          <Settings size={16} />
          <strong>LLM config</strong>
        </div>
        <p className="settings-hint">Optional OpenAI-compatible model settings. These are saved only in this browser.</p>
        <div className="config-form">
          <label className="field">
            Provider name
            <input value={config.providerName} onChange={(event) => updateModel("providerName", event.target.value)} />
          </label>
          <label className="field">
            Base URL
            <input placeholder="https://api.example.com/v1" value={config.baseUrl} onChange={(event) => updateModel("baseUrl", event.target.value)} />
          </label>
          <label className="field">
            Model
            <input placeholder="gpt-4.1-mini" value={config.modelName} onChange={(event) => updateModel("modelName", event.target.value)} />
          </label>
          <label className="field">
            API Key
            <input type="password" placeholder="Saved in browser only" value={config.apiKey} onChange={(event) => updateModel("apiKey", event.target.value)} />
          </label>
        </div>
      </div>

      <div className="settings-block">
        <div className="settings-block-title">
          <Wifi size={16} />
          <strong>Listing platform APIs</strong>
        </div>
        <p className="settings-hint">
          Enable any provider you have access to. One provider is enough. Beike can use POST + form-urlencoded + access_token header.
        </p>

        <div className="provider-config-list">
          {providerKeys.map((providerKey) => {
            const provider = listingApiConfig[providerKey];
            return (
              <div className="provider-config-card" key={providerKey}>
                <div className="provider-config-head">
                  <label className="switch-line">
                    <input type="checkbox" checked={provider.enabled} onChange={(event) => updateProvider(providerKey, "enabled", event.target.checked)} />
                    Enable {provider.label}
                  </label>
                  <span>{provider.method}</span>
                </div>
                <div className="config-form two-column">
                  <label className="field">
                    Display name
                    <input value={provider.label} onChange={(event) => updateProvider(providerKey, "label", event.target.value)} />
                  </label>
                  <label className="field">
                    Method
                    <select value={provider.method} onChange={(event) => updateProvider(providerKey, "method", event.target.value as ListingApiProviderConfig["method"])}>
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                    </select>
                  </label>
                  <label className="field">
                    Base URL
                    <input placeholder="https://gw-open.ke.com" value={provider.baseUrl} onChange={(event) => updateProvider(providerKey, "baseUrl", event.target.value)} />
                  </label>
                  <label className="field">
                    Endpoint
                    <input placeholder="/Open/In/Building/Add" value={provider.endpoint} onChange={(event) => updateProvider(providerKey, "endpoint", event.target.value)} />
                  </label>
                  <label className="field">
                    Auth header
                    <select value={provider.authType} onChange={(event) => updateProvider(providerKey, "authType", event.target.value as ListingApiProviderConfig["authType"])}>
                      <option value="access_token">access_token</option>
                      <option value="bearer">Authorization: Bearer</option>
                      <option value="x-api-key">x-api-key</option>
                    </select>
                  </label>
                  <label className="field">
                    Token / API Key
                    <input type="password" value={provider.accessToken} onChange={(event) => updateProvider(providerKey, "accessToken", event.target.value)} />
                  </label>
                  <label className="field wide-field">
                    POST form body / GET query, one key=value per line
                    <textarea
                      rows={8}
                      placeholder={"city_name=北京市\ndistrict_name=海淀区\nresblock_name=弘源首著大厦"}
                      value={provider.bodyText}
                      onChange={(event) => updateProvider(providerKey, "bodyText", event.target.value)}
                    />
                  </label>
                </div>
              </div>
            );
          })}
        </div>

        <div className="api-test-actions">
          <button className="secondary-button" type="button" onClick={onTestApi} disabled={isTestingApi || enabledCount === 0}>
            <Wifi size={16} />
            {isTestingApi ? "Testing..." : `Test enabled APIs (${enabledCount})`}
          </button>
          <span>{enabledCount === 0 ? "Enable at least one provider and fill Base URL + Token." : "Missing providers are skipped."}</span>
        </div>

        {apiTestResults.length > 0 && (
          <div className="api-test-results">
            {apiTestResults.map((result) => (
              <div className={result.ok ? "api-test-result ok" : "api-test-result fail"} key={result.provider}>
                <strong>{result.label}</strong>
                <span>{result.ok ? "OK" : "Failed"}</span>
                <p>{result.message || `HTTP ${result.status || "-"}`}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <button className="secondary-button full" type="button" onClick={onSaveConfig}>
        <Save size={16} />
        Save settings
      </button>
    </section>
  );
}
