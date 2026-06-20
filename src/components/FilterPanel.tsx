import { Search, SlidersHorizontal } from "lucide-react";
import { SearchCriteria } from "../lib/types";

interface FilterPanelProps {
  criteria: SearchCriteria;
  onChange: (criteria: SearchCriteria) => void;
  resultCount: number;
  compact?: boolean;
}

const districtsByCity: Record<string, string[]> = {
  北京: ["朝阳", "海淀", "丰台"],
  上海: ["浦东"],
};

const featureOptions = ["近地铁", "电梯", "民水民电", "南向", "可养宠", "独立阳台", "集中供暖", "视频看房"];

export function FilterPanel({ criteria, onChange, resultCount, compact = false }: FilterPanelProps) {
  const update = <K extends keyof SearchCriteria>(key: K, value: SearchCriteria[K]) => {
    onChange({ ...criteria, [key]: value });
  };

  const toggleDistrict = (district: string) => {
    const exists = criteria.districts.includes(district);
    update("districts", exists ? criteria.districts.filter((item) => item !== district) : [...criteria.districts, district]);
  };

  const toggleFeature = (feature: string) => {
    const exists = criteria.features.includes(feature);
    update("features", exists ? criteria.features.filter((item) => item !== feature) : [...criteria.features, feature]);
  };

  return (
    <section className={compact ? "filter-panel compact" : "filter-panel"}>
      <div className="panel-heading">
        <div>
          <p className="kicker">筛选条件</p>
          <h2>贝壳式筛选</h2>
        </div>
        <span className="count-pill">
          <Search size={14} /> {resultCount} 套
        </span>
      </div>

      <div className="filter-grid">
        <label className="field">
          城市
          <select
            value={criteria.city}
            onChange={(event) =>
              onChange({
                ...criteria,
                city: event.target.value,
                districts: [],
              })
            }
          >
            <option>北京</option>
            <option>上海</option>
          </select>
        </label>

        <div className="field wide-field">
          区域
          <div className="chip-row">
            {(districtsByCity[criteria.city] || []).map((district) => (
              <button className={criteria.districts.includes(district) ? "chip active" : "chip"} key={district} onClick={() => toggleDistrict(district)} type="button">
                {district}
              </button>
            ))}
          </div>
        </div>

        <label className="field">
          最低租金
          <input type="number" min={0} step={100} value={criteria.budgetMin} onChange={(event) => update("budgetMin", Number(event.target.value))} />
        </label>
        <label className="field">
          最高租金
          <input type="number" min={0} step={100} value={criteria.budgetMax} onChange={(event) => update("budgetMax", Number(event.target.value))} />
        </label>
        <label className="field">
          户型
          <select value={criteria.rooms} onChange={(event) => update("rooms", event.target.value as SearchCriteria["rooms"])}>
            <option>不限</option>
            <option>开间</option>
            <option>一居</option>
            <option>两居</option>
            <option>三居及以上</option>
          </select>
        </label>
        <label className="field">
          租住方式
          <select value={criteria.rentalType} onChange={(event) => update("rentalType", event.target.value as SearchCriteria["rentalType"])}>
            <option>不限</option>
            <option>整租</option>
            <option>合租</option>
          </select>
        </label>
        <label className="field">
          面积下限
          <input type="number" min={0} step={5} value={criteria.areaMin} onChange={(event) => update("areaMin", Number(event.target.value))} />
        </label>
        <label className="field">
          面积上限
          <input type="number" min={0} step={5} value={criteria.areaMax} onChange={(event) => update("areaMax", Number(event.target.value))} />
        </label>
        <label className="field">
          朝向
          <select value={criteria.orientation} onChange={(event) => update("orientation", event.target.value as SearchCriteria["orientation"])}>
            <option>不限</option>
            <option>南北</option>
            <option>南</option>
            <option>东</option>
            <option>西</option>
            <option>北</option>
          </select>
        </label>
        <label className="field">
          楼层
          <select value={criteria.floorPreference} onChange={(event) => update("floorPreference", event.target.value as SearchCriteria["floorPreference"])}>
            <option>不限</option>
            <option>低楼层</option>
            <option>中楼层</option>
            <option>高楼层</option>
          </select>
        </label>
        <label className="field">
          付款方式
          <select value={criteria.payPreference} onChange={(event) => update("payPreference", event.target.value as SearchCriteria["payPreference"])}>
            <option>不限</option>
            <option>月付</option>
            <option>季付</option>
            <option>半年付</option>
          </select>
        </label>
        <label className="field">
          关键词
          <div className="input-with-icon">
            <SlidersHorizontal size={16} />
            <input value={criteria.keywords} placeholder="例如：南向 民水民电" onChange={(event) => update("keywords", event.target.value)} />
          </div>
        </label>
      </div>

      <div className="filter-sliders">
        <label className="field">
          地铁距离：{criteria.maxSubwayDistance} 米内
          <input type="range" min={300} max={1500} step={100} value={criteria.maxSubwayDistance} onChange={(event) => update("maxSubwayDistance", Number(event.target.value))} />
        </label>
        <label className="field">
          通勤时间：{criteria.maxCommuteMinutes} 分钟内
          <input type="range" min={20} max={75} step={5} value={criteria.maxCommuteMinutes} onChange={(event) => update("maxCommuteMinutes", Number(event.target.value))} />
        </label>
      </div>

      <div className="field">
        特色
        <div className="chip-row">
          {featureOptions.map((feature) => (
            <button className={criteria.features.includes(feature) ? "chip active" : "chip"} key={feature} type="button" onClick={() => toggleFeature(feature)}>
              {feature}
            </button>
          ))}
        </div>
      </div>

      <div className="toggle-list">
        <label>
          <input type="checkbox" checked={criteria.mustHaveElevator} onChange={(event) => update("mustHaveElevator", event.target.checked)} />
          必须有电梯
        </label>
        <label>
          <input type="checkbox" checked={criteria.allowPets} onChange={(event) => update("allowPets", event.target.checked)} />
          需要可养宠
        </label>
        <label>
          <input type="checkbox" checked={criteria.excludeHighRisk} onChange={(event) => update("excludeHighRisk", event.target.checked)} />
          自动排除高风险
        </label>
      </div>
    </section>
  );
}
