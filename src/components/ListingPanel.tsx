import { Copy, Download, Heart, Home, ShieldAlert } from "lucide-react";
import { FilterPanel } from "./FilterPanel";
import { ScoredListing, SearchCriteria } from "../lib/types";

type SourceFilter = "全部" | "贝壳" | "安居客" | "58同城";

interface ListingPanelProps {
  listings: ScoredListing[];
  favorites: string[];
  activeSource: SourceFilter;
  sourceCounts: Record<SourceFilter, number>;
  criteria: SearchCriteria;
  onCriteriaChange: (criteria: SearchCriteria) => void;
  onSourceChange: (source: SourceFilter) => void;
  onToggleFavorite: (id: string) => void;
  onCopySummary: () => void;
  onExport: () => void;
  copied: boolean;
}

export function ListingPanel({
  listings,
  favorites,
  activeSource,
  sourceCounts,
  criteria,
  onCriteriaChange,
  onSourceChange,
  onToggleFavorite,
  onCopySummary,
  onExport,
  copied,
}: ListingPanelProps) {
  return (
    <section className="listing-page">
      <FilterPanel criteria={criteria} onChange={onCriteriaChange} resultCount={listings.length} compact />

      <div className="listings-toolbar">
        <div>
          <span>聚合房源</span>
          <h2>{activeSource} 房源池</h2>
        </div>
        <div className="button-row">
          <button className="icon-button" type="button" onClick={onCopySummary} title="复制摘要">
            <Copy size={16} />
            {copied ? "已复制" : "摘要"}
          </button>
          <button className="icon-button" type="button" onClick={onExport} title="导出 JSON">
            <Download size={16} />
            导出
          </button>
        </div>
      </div>

      <div className="source-tabs">
        {(["全部", "贝壳", "安居客", "58同城"] as SourceFilter[]).map((source) => (
          <button className={activeSource === source ? "active" : ""} key={source} type="button" onClick={() => onSourceChange(source)}>
            {source}
            <span>{sourceCounts[source]}</span>
          </button>
        ))}
      </div>

      {listings.length === 0 ? (
        <div className="empty-results">
          <Home size={24} />
          <h3>当前没有匹配房源</h3>
          <p>可以放宽预算、区域、地铁距离，或暂时关闭“自动排除高风险”。</p>
        </div>
      ) : (
        <div className="listing-list">
          {listings.map((listing) => (
            <article className="listing-card" key={listing.id}>
              <div className="listing-topline">
                <div>
                  <span className={`risk risk-${listing.riskLevel}`}>风险{listing.riskLevel}</span>
                  {listing.isNew && <span className="new-badge">新上</span>}
                </div>
                <button className={favorites.includes(listing.id) ? "heart-button active" : "heart-button"} type="button" onClick={() => onToggleFavorite(listing.id)} title="收藏房源">
                  <Heart size={16} />
                </button>
              </div>
              <h3>{listing.title}</h3>
              <div className="price-line">
                <strong>{listing.rent}</strong>
                <span>元/月 · 匹配分 {listing.score}</span>
              </div>
              <p className="meta">
                {listing.district} · {listing.community} · {listing.rooms} · {listing.rentalType} · {listing.area}㎡
              </p>
              <p className="meta">
                地铁约 {listing.subwayDistance} 米 · 通勤约 {listing.commuteMinutes} 分钟 · {listing.floor}
              </p>
              <div className="tag-row">
                {listing.tags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
              <div className="reason-box">
                <strong>推荐理由</strong>
                <ul>
                  {listing.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
              </div>
              <div className="risk-box">
                <ShieldAlert size={16} />
                <div>
                  <strong>{listing.riskFlags.join("、") || "暂无明显风险"}</strong>
                  <p>{listing.questions[0]}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
