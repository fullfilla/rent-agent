import { LocateFixed, MapPin } from "lucide-react";
import { FilterPanel } from "./FilterPanel";
import { ScoredListing, SearchCriteria } from "../lib/types";

interface MapSearchPanelProps {
  criteria: SearchCriteria;
  listings: ScoredListing[];
  onCriteriaChange: (criteria: SearchCriteria) => void;
}

export function MapSearchPanel({ criteria, listings, onCriteriaChange }: MapSearchPanelProps) {
  const minLng = Math.min(...listings.map((item) => item.lng), 116.3);
  const maxLng = Math.max(...listings.map((item) => item.lng), 116.6);
  const minLat = Math.min(...listings.map((item) => item.lat), 39.8);
  const maxLat = Math.max(...listings.map((item) => item.lat), 40.05);

  function position(listing: ScoredListing) {
    const x = ((listing.lng - minLng) / Math.max(maxLng - minLng, 0.01)) * 78 + 10;
    const y = (1 - (listing.lat - minLat) / Math.max(maxLat - minLat, 0.01)) * 70 + 12;
    return { left: `${x}%`, top: `${y}%` };
  }

  return (
    <section className="map-page">
      <FilterPanel criteria={criteria} onChange={onCriteriaChange} resultCount={listings.length} compact />
      <div className="map-workspace">
        <div className="mock-map">
          <div className="map-grid" />
          <div className="map-center">
            <LocateFixed size={16} />
            {criteria.city} · {criteria.districts.join("、") || "不限区域"}
          </div>
          {listings.map((listing) => (
            <button className="map-marker" key={listing.id} style={position(listing)} type="button" title={listing.title}>
              <MapPin size={15} />
              <span>{listing.rent}</span>
            </button>
          ))}
        </div>
        <div className="map-side-list">
          <h2>地图范围内房源</h2>
          {listings.length === 0 ? (
            <p className="muted-text">当前地图范围没有匹配房源，可以放宽筛选条件。</p>
          ) : (
            listings.slice(0, 5).map((listing) => (
              <article className="map-listing" key={listing.id}>
                <strong>{listing.community}</strong>
                <span>{listing.rent} 元/月 · {listing.rooms} · {listing.subwayDistance} 米到地铁</span>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
