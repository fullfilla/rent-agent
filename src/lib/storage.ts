export function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function saveJson<T>(key: string, value: T): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export const storageKeys = {
  criteria: "rent-agent.criteria",
  messages: "rent-agent.messages",
  sessions: "rent-agent.sessions",
  activeSessionId: "rent-agent.active-session-id",
  memory: "rent-agent.memory",
  modelConfig: "rent-agent.model-config",
  listingApiConfig: "rent-agent.listing-api-config",
  favorites: "rent-agent.favorites",
};
