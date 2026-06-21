import { useEffect, useMemo, useState } from "react";
import { Archive, Bot, Building2, ChevronRight, Heart, Map, MessageSquare, Pin, PinOff, Plus, RefreshCw, Search, Settings, Trash2 } from "lucide-react";
import { ChatPanel } from "./components/ChatPanel";
import { ListingPanel } from "./components/ListingPanel";
import { MapSearchPanel } from "./components/MapSearchPanel";
import { SettingsPanel } from "./components/SettingsPanel";
import { createFreshListing, mockListings } from "./data/mockListings";
import { runMockAgent } from "./lib/agent";
import { buildSummary, defaultCriteria, getRankedListings } from "./lib/scoring";
import { loadJson, saveJson, storageKeys } from "./lib/storage";
import { AgentStep, ChatMessage, ChatSession, ListingApiConfig, ListingApiTestResult, MemoryState, ModelConfig, RentalListing, SearchCriteria } from "./lib/types";

type WorkspaceView = "chat" | "listings" | "map" | "favorites" | "settings";
type SourceFilter = "全部" | "贝壳" | "安居客" | "58同城";

const defaultModelConfig: ModelConfig = {
  providerName: "OpenAI Compatible",
  baseUrl: "",
  apiKey: "",
  modelName: "",
};

const defaultListingApiConfig: ListingApiConfig = {
  beike: {
    enabled: true,
    label: "Beike",
    baseUrl: "https://gw-open.ke.com",
    endpoint: "/Open/In/Building/Add",
    method: "POST",
    authType: "access_token",
    accessToken: "",
    bodyText: [
      "city_name=北京市",
      "district_name=海淀区",
      "resblock_name=弘源首著大厦",
      "building_name=1号楼",
      "address=北京市海淀区",
      "stat_usage=xzl",
      "trade_owner=notreal",
      "property_age=y50",
      "build_area=30000.00",
      "resblock_lat=40.049317",
      "resblock_lng=116.311989",
      "building_lat=40.049383",
      "building_lng=116.312053",
      "unit_count=2",
      "floor_count=8",
      "stand_high=2.5",
      "stand_area=10.00",
      "house_rate=78.00",
      "cubage_rate=90.00",
      "lift_count=6",
      "developers=北京新奥特集团物业管理事业部",
      "property=北京新奥特集团物业管理事业部",
      "build_date=2000年1月1号",
      "car_count=150",
      "resblock_images=https://images.url.com",
      "building_images=https://images.url.com",
    ].join("\n"),
  },
  anjuke: {
    enabled: false,
    label: "Anjuke",
    baseUrl: "",
    endpoint: "/rent/listings",
    method: "GET",
    authType: "bearer",
    accessToken: "",
    bodyText: "",
  },
  wuba: {
    enabled: false,
    label: "58",
    baseUrl: "",
    endpoint: "/rent/listings",
    method: "GET",
    authType: "bearer",
    accessToken: "",
    bodyText: "",
  },
};

const defaultMemory: MemoryState = {
  midTermSummaries: [],
  longTermProfile: {
    cities: [],
    districts: [],
  },
};

const sourceMap: Record<string, SourceFilter> = {
  "mock-beike": "贝壳",
  "mock-anjuke": "安居客",
  "mock-58": "58同城",
  "mock-refresh": "贝壳",
};

function sourceName(source: string): SourceFilter {
  return sourceMap[source] || "58同城";
}

function createSession(criteria: SearchCriteria = defaultCriteria): ChatSession {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title: "新的租房对话",
    messages: [],
    criteria,
    shortMemory: [],
    summary: "",
    createdAt: now,
    updatedAt: now,
  };
}

function titleFromMessage(content: string) {
  return content.replace(/\s+/g, " ").slice(0, 22) || "租房需求";
}

function summarizeSession(messages: ChatMessage[], criteria: SearchCriteria) {
  const lastUser = [...messages].reverse().find((message) => message.role === "user");
  const area = criteria.districts.length ? criteria.districts.join("、") : criteria.city;
  return `${area}｜${criteria.budgetMin}-${criteria.budgetMax} 元｜${criteria.rentalType}｜${lastUser?.content.slice(0, 28) || "暂无需求"}`;
}

function updateMemory(memory: MemoryState, session: ChatSession): MemoryState {
  const profile = { ...memory.longTermProfile };
  profile.cities = Array.from(new Set([...profile.cities, session.criteria.city].filter(Boolean)));
  profile.districts = Array.from(new Set([...profile.districts, ...session.criteria.districts]));
  profile.budgetMin = session.criteria.budgetMin;
  profile.budgetMax = session.criteria.budgetMax;
  profile.rentalType = session.criteria.rentalType;
  profile.rooms = session.criteria.rooms;
  profile.commutePreference = `${session.criteria.maxCommuteMinutes} 分钟内`;
  profile.riskPreference = session.criteria.excludeHighRisk ? "倾向排除高风险房源" : "愿意先看完整房源";
  profile.petPreference = session.criteria.allowPets ? "需要可养宠" : profile.petPreference;
  profile.updatedAt = new Date().toISOString();

  const summary = session.summary || summarizeSession(session.messages, session.criteria);
  const midTermSummaries = [summary, ...memory.midTermSummaries.filter((item) => item !== summary)].slice(0, 8);

  return {
    midTermSummaries,
    longTermProfile: profile,
  };
}

export default function App() {
  const [activeView, setActiveView] = useState<WorkspaceView>("chat");
  const [activeSource, setActiveSource] = useState<SourceFilter>("全部");
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const stored = loadJson<ChatSession[]>(storageKeys.sessions, []);
    return stored.length ? stored : [createSession()];
  });
  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    const storedId = loadJson<string | null>(storageKeys.activeSessionId, null);
    const storedSessions = loadJson<ChatSession[]>(storageKeys.sessions, []);
    return storedId || storedSessions[0]?.id || "";
  });
  const [memory, setMemory] = useState<MemoryState>(() => loadJson(storageKeys.memory, defaultMemory));
  const [modelConfig, setModelConfig] = useState<ModelConfig>(() => loadJson(storageKeys.modelConfig, defaultModelConfig));
  const [listingApiConfig, setListingApiConfig] = useState<ListingApiConfig>(() => loadJson(storageKeys.listingApiConfig, defaultListingApiConfig));
  const [apiTestResults, setApiTestResults] = useState<ListingApiTestResult[]>([]);
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [favorites, setFavorites] = useState<string[]>(() => loadJson<string[]>(storageKeys.favorites, []));
  const [listings, setListings] = useState<RentalListing[]>(mockListings);
  const [draft, setDraft] = useState("");
  const [steps, setSteps] = useState<AgentStep[]>([
    { title: "准备就绪", detail: "短期记忆会跟随当前对话更新。", status: "done" },
  ]);
  const [isThinking, setIsThinking] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastRefreshAt, setLastRefreshAt] = useState("");
  const [notice, setNotice] = useState("说出预算、通勤和偏好，我来帮你把房源捞出来 (｡•̀ᴗ-)✧");
  const [copied, setCopied] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const activeSession = useMemo(() => {
    return sessions.find((session) => session.id === activeSessionId) || sessions[0] || createSession();
  }, [sessions, activeSessionId]);

  const criteria = activeSession.criteria;
  const messages = activeSession.messages;

  const rankedListings = useMemo(() => getRankedListings(listings, criteria), [criteria, listings]);
  const visibleListings = useMemo(
    () => rankedListings.filter((item) => activeSource === "全部" || sourceName(item.source) === activeSource),
    [rankedListings, activeSource],
  );
  const favoriteListings = useMemo(() => rankedListings.filter((item) => favorites.includes(item.id)), [rankedListings, favorites]);

  const sourceCounts = useMemo(() => {
    const counts: Record<SourceFilter, number> = { 全部: rankedListings.length, 贝壳: 0, 安居客: 0, "58同城": 0 };
    rankedListings.forEach((item) => {
      counts[sourceName(item.source)] += 1;
    });
    return counts;
  }, [rankedListings]);

  const archiveSessions = useMemo(() => {
    const archived = [...sessions].sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || b.updatedAt.localeCompare(a.updatedAt));
    const query = searchQuery.trim();
    return query ? archived.filter((session) => `${session.title} ${session.summary}`.includes(query)) : archived;
  }, [sessions, searchQuery]);

  useEffect(() => {
    if (!activeSessionId && sessions[0]) setActiveSessionId(sessions[0].id);
  }, [activeSessionId, sessions]);

  useEffect(() => {
    saveJson(storageKeys.sessions, sessions);
  }, [sessions]);

  useEffect(() => {
    saveJson(storageKeys.activeSessionId, activeSessionId);
  }, [activeSessionId]);

  useEffect(() => {
    saveJson(storageKeys.memory, memory);
  }, [memory]);

  useEffect(() => {
    saveJson(storageKeys.favorites, favorites);
  }, [favorites]);

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = window.setInterval(() => {
      refreshListings();
    }, 30000);
    return () => window.clearInterval(timer);
  }, [autoRefresh, refreshCount]);

  function updateActiveSession(updater: (session: ChatSession) => ChatSession) {
    setSessions((current) =>
      current.map((session) => {
        if (session.id !== activeSession.id) return session;
        return updater(session);
      }),
    );
  }

  function setCriteria(criteriaNext: SearchCriteria) {
    updateActiveSession((session) => {
      const nextSession = {
        ...session,
        criteria: criteriaNext,
        summary: summarizeSession(session.messages, criteriaNext),
        updatedAt: new Date().toISOString(),
      };
      setMemory((current) => updateMemory(current, nextSession));
      return nextSession;
    });
  }

  function sendMessage(messageText = draft) {
    const content = messageText.trim();
    if (!content) {
      setNotice("先说说预算、区域或通勤要求，再让 Agent 开始找房。");
      return;
    }

    setIsThinking(true);
    setActiveView("chat");
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };

    const baseCriteria = activeSession.criteria;
    const baseMessages = [...activeSession.messages, userMessage];

    updateActiveSession((session) => ({
      ...session,
      title: session.messages.length === 0 ? titleFromMessage(content) : session.title,
      messages: baseMessages,
      shortMemory: [content, ...session.shortMemory].slice(0, 6),
      summary: summarizeSession(baseMessages, session.criteria),
      updatedAt: new Date().toISOString(),
    }));
    setDraft("");

    window.setTimeout(() => {
      const result = runMockAgent(content, baseCriteria, listings);
      const nextMessages = [...baseMessages, result.message];
      const nextSession: ChatSession = {
        ...activeSession,
        title: activeSession.messages.length === 0 ? titleFromMessage(content) : activeSession.title,
        messages: nextMessages,
        criteria: result.criteria,
        shortMemory: [content, ...activeSession.shortMemory].slice(0, 6),
        summary: summarizeSession(nextMessages, result.criteria),
        updatedAt: new Date().toISOString(),
      };

      setSessions((current) => current.map((session) => (session.id === activeSession.id ? nextSession : session)));
      setMemory((current) => updateMemory(current, nextSession));
      setSteps([
        ...result.steps,
        { title: "短期记忆", detail: `当前会话已记住 ${nextSession.shortMemory.length} 条近期需求`, status: "done" },
        { title: "长期画像", detail: `偏好已沉淀到用户画像：${result.criteria.city}，${result.criteria.budgetMax} 元内`, status: "done" },
      ]);
      setNotice("已更新本轮需求、会话记忆和用户画像 (＾▽＾)");
      setIsThinking(false);
    }, 450);
  }

  async function fetchListingApis() {
    const response = await fetch("/api/platform-test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ providers: listingApiConfig }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return (await response.json()) as { results: ListingApiTestResult[]; listings?: RentalListing[] };
  }

  async function testListingApis() {
    setIsTestingApi(true);
    try {
      const payload = await fetchListingApis();
      setApiTestResults(payload.results || []);
      setNotice("房源平台 API 测试完成；未启用或未配置的平台会自动跳过。");
    } catch (error) {
      setApiTestResults([]);
      setNotice(`房源平台 API 测试失败：${error instanceof Error ? error.message : "未知错误"}`);
    } finally {
      setIsTestingApi(false);
    }
  }

  async function refreshListings() {
    setIsRefreshing(true);
    try {
      const payload = await fetchListingApis();
      setApiTestResults(payload.results || []);
      if (payload.listings?.length) {
        setListings(payload.listings);
        setLastRefreshAt(new Date().toISOString());
        setNotice(`刷新完成：已从已启用平台加载 ${payload.listings.length} 条房源。`);
        setIsRefreshing(false);
        return;
      }
    } catch {
      // Keep the MVP usable when the API is not configured or the dev server is running without the Node proxy.
    }

    window.setTimeout(() => {
      const nextRefreshCount = refreshCount + 1;
      setRefreshCount(nextRefreshCount);
      setLastRefreshAt(new Date().toISOString());
      setListings((current: RentalListing[]) => {
        if (nextRefreshCount % 2 === 1) {
          return [createFreshListing(nextRefreshCount), ...current.map((item: RentalListing) => ({ ...item, isNew: false }))];
        }
        return current.map((item: RentalListing) => ({ ...item, updatedAt: new Date().toISOString(), isNew: false }));
      });
      setNotice(nextRefreshCount % 2 === 1 ? "刷新完成：新增一批候选房源。" : "刷新完成：房源时间已更新。");
      setIsRefreshing(false);
    }, 500);
  }

  function saveModelConfig() {
    const ok = saveJson(storageKeys.modelConfig, modelConfig) && saveJson(storageKeys.listingApiConfig, listingApiConfig);
    setNotice(ok ? "模型和房源平台 API 配置已保存到本机浏览器。" : "保存失败：浏览器可能禁用了本地存储。");
  }

  function startNewChat() {
    const nextSession = createSession(activeSession.criteria);
    setSessions((current) => [nextSession, ...current]);
    setActiveSessionId(nextSession.id);
    setDraft("");
    setSteps([{ title: "新会话", detail: "上一段对话已留在归档里，长期画像会继续保留。", status: "done" }]);
    setActiveView("chat");
    setNotice("新对话已打开，之前的聊天记录已经归档 (ง •̀_•́)ง");
  }

  function toggleSearch() {
    setSearchOpen((current) => !current);
    setNotice("输入关键词，就能翻到之前聊过的租房需求 (＾▽＾)");
  }

  function togglePinSession(sessionId: string) {
    setSessions((current) =>
      current.map((session) => (session.id === sessionId ? { ...session, pinned: !session.pinned, updatedAt: new Date().toISOString() } : session)),
    );
    const target = sessions.find((session) => session.id === sessionId);
    setNotice(target?.pinned ? "已取消置顶这段对话。" : "已把这段对话钉到归档顶部。");
  }

  function deleteSession(sessionId: string) {
    setSessions((current) => {
      if (current.length <= 1) {
        const replacement = createSession(activeSession.criteria);
        setActiveSessionId(replacement.id);
        return [replacement];
      }

      const remaining = current.filter((session) => session.id !== sessionId);
      if (sessionId === activeSessionId) {
        setActiveSessionId(remaining[0].id);
        setActiveView("chat");
      }
      return remaining;
    });
    setNotice("这段对话已从归档删除。");
  }

  function toggleFavorite(id: string) {
    setFavorites((current: string[]) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  async function copySummary() {
    const target = activeView === "favorites" ? favoriteListings : visibleListings;
    try {
      await navigator.clipboard.writeText(buildSummary(target));
      setCopied(true);
      setNotice("已复制当前房源摘要。");
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setNotice("复制失败：浏览器权限不允许时，可以手动选择文本。");
    }
  }

  function exportJson() {
    const target = activeView === "favorites" ? favoriteListings : visibleListings;
    const payload = {
      exportedAt: new Date().toISOString(),
      activeSource,
      criteria,
      memory,
      session: activeSession,
      favorites,
      results: target,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `rent-agent-results-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("已导出当前会话、记忆和房源结果 JSON。");
  }

  function renderMain() {
    if (activeView === "listings" || activeView === "favorites") {
      return (
        <ListingPanel
          listings={activeView === "favorites" ? favoriteListings : visibleListings}
          favorites={favorites}
          activeSource={activeSource}
          sourceCounts={sourceCounts}
          criteria={criteria}
          onCriteriaChange={setCriteria}
          onSourceChange={setActiveSource}
          onToggleFavorite={toggleFavorite}
          onCopySummary={copySummary}
          onExport={exportJson}
          copied={copied}
        />
      );
    }

    if (activeView === "map") {
      return <MapSearchPanel criteria={criteria} listings={visibleListings} onCriteriaChange={setCriteria} />;
    }

    if (activeView === "settings") {
      return (
        <div className="settings-workspace">
          <SettingsPanel
            config={modelConfig}
            listingApiConfig={listingApiConfig}
            apiTestResults={apiTestResults}
            autoRefresh={autoRefresh}
            lastRefreshAt={lastRefreshAt}
            isRefreshing={isRefreshing}
            isTestingApi={isTestingApi}
            onConfigChange={setModelConfig}
            onListingApiConfigChange={setListingApiConfig}
            onSaveConfig={saveModelConfig}
            onRefresh={refreshListings}
            onTestApi={testListingApis}
            onAutoRefreshChange={setAutoRefresh}
          />
          <section className="memory-panel">
            <div className="panel-heading compact">
              <div>
                <p className="kicker">记忆</p>
                <h2>用户画像</h2>
              </div>
            </div>
            <div className="memory-grid">
              <div>
                <strong>短期记忆</strong>
                <p>{activeSession.shortMemory.length ? activeSession.shortMemory.join(" / ") : "当前会话暂无近期需求"}</p>
              </div>
              <div>
                <strong>中期记忆</strong>
                <p>{memory.midTermSummaries.length ? memory.midTermSummaries.slice(0, 3).join(" / ") : "暂无历史会话摘要"}</p>
              </div>
              <div>
                <strong>长期画像</strong>
                <p>
                  {memory.longTermProfile.cities.join("、") || "城市未定"} · {memory.longTermProfile.budgetMax ? `${memory.longTermProfile.budgetMax} 元内` : "预算未定"} ·{" "}
                  {memory.longTermProfile.riskPreference || "风险偏好未定"}
                </p>
              </div>
            </div>
          </section>
        </div>
      );
    }

    return (
      <ChatPanel
        messages={messages}
        steps={steps}
        draft={draft}
        isThinking={isThinking}
        onDraftChange={setDraft}
        onSend={() => sendMessage()}
        onUseExample={(value) => sendMessage(value)}
      />
    );
  }

  const title =
    activeView === "chat"
      ? "租房 Agent 对话"
      : activeView === "listings"
        ? "房源聚合"
        : activeView === "map"
          ? "地图找房"
          : activeView === "favorites"
            ? "收藏房源"
            : "设置";

  return (
    <div className="codex-shell">
      <aside className="codex-sidebar">
        <div className="app-mark">
          <span>
            <Bot size={19} />
          </span>
          <div>
            <strong>租房 Agent</strong>
            <p>对话找房 · 聚合避坑</p>
          </div>
        </div>

        <div className="sidebar-top-actions">
          <button type="button" onClick={startNewChat}>
            <Plus size={17} />
            新对话
          </button>
          <button type="button" onClick={toggleSearch}>
            <Search size={17} />
            搜索
          </button>
        </div>

        {searchOpen && (
          <div className="sidebar-search">
            <Search size={15} />
            <input value={searchQuery} placeholder="搜索对话归档" onChange={(event) => setSearchQuery(event.target.value)} />
          </div>
        )}

        <div className="sidebar-section">
          <p>工作区</p>
          <button className={activeView === "chat" ? "side-item active" : "side-item"} type="button" onClick={() => setActiveView("chat")}>
            <MessageSquare size={17} />
            <span>Agent 对话</span>
            <ChevronRight size={15} />
          </button>
          <button className={activeView === "listings" ? "side-item active" : "side-item"} type="button" onClick={() => setActiveView("listings")}>
            <Building2 size={17} />
            <span>房源聚合</span>
            <em>{rankedListings.length}</em>
          </button>
          <button className={activeView === "map" ? "side-item active" : "side-item"} type="button" onClick={() => setActiveView("map")}>
            <Map size={17} />
            <span>地图找房</span>
            <em>{visibleListings.length}</em>
          </button>
          <button className={activeView === "favorites" ? "side-item active favorite-row" : "side-item favorite-row"} type="button" onClick={() => setActiveView("favorites")}>
            <Heart size={17} />
            <span>收藏</span>
            <em>{favorites.length}</em>
          </button>
        </div>

        <div className="sidebar-section archive-section">
          <p>Agent 对话记录归档</p>
          {archiveSessions.length === 0 ? (
            <div className="archive-empty">
              <Archive size={16} />
              暂无归档
            </div>
          ) : (
            archiveSessions.map((session) => (
              <div className={session.id === activeSession.id ? "archive-row active" : "archive-row"} key={session.id}>
                <button
                  className="archive-item"
                  type="button"
                  onClick={() => {
                    setActiveSessionId(session.id);
                    setActiveView("chat");
                  }}
                >
                  <span>{session.title}</span>
                  <em>{new Date(session.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</em>
                </button>
                <button
                  className={session.pinned ? "archive-action active" : "archive-action"}
                  type="button"
                  title={session.pinned ? "取消置顶" : "置顶"}
                  aria-label={session.pinned ? "取消置顶" : "置顶"}
                  onClick={() => togglePinSession(session.id)}
                >
                  {session.pinned ? <PinOff size={14} /> : <Pin size={14} />}
                </button>
                <button className="archive-action danger" type="button" title="删除" aria-label="删除" onClick={() => deleteSession(session.id)}>
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="sidebar-footer">
          <button className={activeView === "settings" ? "active" : ""} type="button" onClick={() => setActiveView("settings")}>
            <Settings size={17} />
            设置
          </button>
        </div>
      </aside>

      <main className="codex-main">
        <header className="product-topbar">
          <div>
            <p>Rent Agent MVP</p>
            <h1>{title}</h1>
          </div>
          <div className="topbar-actions">
            <span>{lastRefreshAt ? `刷新于 ${new Date(lastRefreshAt).toLocaleTimeString()}` : "尚未刷新"}</span>
            <button className="secondary-button" type="button" onClick={refreshListings} disabled={isRefreshing}>
              <RefreshCw size={16} className={isRefreshing ? "spin" : ""} />
              刷新
            </button>
          </div>
        </header>

        <div className="codex-thread-body">{renderMain()}</div>
        <div className="notice-bar">{notice}</div>
      </main>
    </div>
  );
}
