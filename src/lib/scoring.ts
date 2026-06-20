import { RentalListing, RiskLevel, ScoredListing, SearchCriteria } from "./types";

const highRiskWords = ["转租", "半地下", "半年付", "需核验房东授权", "隔断"];
const mediumRiskWords = ["押金两月", "短租条款需确认", "公区规则需确认", "无电梯", "北向", "预算偏高"];

export const defaultCriteria: SearchCriteria = {
  city: "北京",
  districts: ["朝阳"],
  budgetMin: 3000,
  budgetMax: 6500,
  rooms: "不限",
  rentalType: "不限",
  areaMin: 0,
  areaMax: 120,
  orientation: "不限",
  floorPreference: "不限",
  payPreference: "不限",
  maxSubwayDistance: 1000,
  maxCommuteMinutes: 45,
  mustHaveElevator: false,
  allowPets: false,
  excludeHighRisk: true,
  features: [],
  keywords: "",
};

export function getRiskLevel(listing: RentalListing): RiskLevel {
  if (listing.riskFlags.some((risk) => highRiskWords.some((word) => risk.includes(word)))) return "高";
  if (listing.riskFlags.some((risk) => mediumRiskWords.some((word) => risk.includes(word)))) return "中";
  return "低";
}

export function filterListings(listings: RentalListing[], criteria: SearchCriteria): RentalListing[] {
  const keywords = criteria.keywords
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean);

  return listings.filter((listing) => {
    if (listing.city !== criteria.city) return false;
    if (criteria.districts.length > 0 && !criteria.districts.includes(listing.district)) return false;
    if (listing.rent < criteria.budgetMin || listing.rent > criteria.budgetMax) return false;
    if (criteria.rooms !== "不限" && listing.rooms !== criteria.rooms) return false;
    if (criteria.rentalType !== "不限" && listing.rentalType !== criteria.rentalType) return false;
    if (listing.area < criteria.areaMin || listing.area > criteria.areaMax) return false;
    if (criteria.orientation !== "不限" && listing.orientation !== criteria.orientation) return false;
    if (criteria.floorPreference !== "不限" && listing.floorLevel !== criteria.floorPreference) return false;
    if (criteria.payPreference === "月付" && listing.payMonths !== 1) return false;
    if (criteria.payPreference === "季付" && listing.payMonths !== 3) return false;
    if (criteria.payPreference === "半年付" && listing.payMonths !== 6) return false;
    if (listing.subwayDistance > criteria.maxSubwayDistance) return false;
    if (listing.commuteMinutes > criteria.maxCommuteMinutes) return false;
    if (criteria.mustHaveElevator && !listing.hasElevator) return false;
    if (criteria.allowPets && !listing.allowPets) return false;
    if (criteria.excludeHighRisk && getRiskLevel(listing) === "高") return false;
    if (criteria.features.length > 0 && !criteria.features.every((feature) => listing.tags.includes(feature))) return false;
    if (keywords.length > 0) {
      const text = `${listing.title} ${listing.community} ${listing.address} ${listing.description} ${listing.tags.join(" ")}`;
      if (!keywords.every((keyword) => text.includes(keyword))) return false;
    }
    return true;
  });
}

export function scoreListing(listing: RentalListing, criteria: SearchCriteria): ScoredListing {
  let score = 72;
  const reasons: string[] = [];
  const questions: string[] = [];
  const riskLevel = getRiskLevel(listing);

  if (listing.rent <= criteria.budgetMax) {
    const budgetGap = criteria.budgetMax - listing.rent;
    score += Math.min(12, Math.round(budgetGap / 250));
    reasons.push(`租金 ${listing.rent} 元，在预算上限内`);
  }

  if (listing.subwayDistance <= 600) {
    score += 8;
    reasons.push(`距地铁约 ${listing.subwayDistance} 米，步行压力较小`);
  } else if (listing.subwayDistance <= criteria.maxSubwayDistance) {
    score += 3;
    reasons.push(`地铁距离 ${listing.subwayDistance} 米，仍在可接受范围`);
  }

  if (listing.commuteMinutes <= 30) {
    score += 8;
    reasons.push(`预计通勤 ${listing.commuteMinutes} 分钟，适合高频通勤`);
  } else if (listing.commuteMinutes <= criteria.maxCommuteMinutes) {
    score += 3;
    reasons.push(`通勤 ${listing.commuteMinutes} 分钟，未超过上限`);
  }

  if (criteria.rentalType !== "不限" && listing.rentalType === criteria.rentalType) {
    score += 5;
    reasons.push(`租住方式匹配：${listing.rentalType}`);
  }

  if (criteria.rooms !== "不限" && listing.rooms === criteria.rooms) {
    score += 5;
    reasons.push(`户型匹配：${listing.rooms}`);
  }

  if (listing.hasElevator) score += 2;
  if (listing.orientation.includes("南")) score += 2;
  if (riskLevel === "高") score -= 22;
  if (riskLevel === "中") score -= 8;

  if (listing.depositMonths > 1) questions.push("押金超过一个月，退押条件和扣款标准是什么？");
  if (listing.payMonths >= 3) questions.push(`付款周期为付 ${listing.payMonths}，能否改为月付或季付？`);
  if (listing.riskFlags.some((risk) => risk.includes("转租"))) questions.push("转租是否有房东书面授权？押金由谁退还？");
  if (!listing.hasElevator && listing.floor.includes("高")) questions.push("高楼层无电梯，搬家和日常通勤是否可接受？");
  if (listing.rentalType === "合租") questions.push("室友人数、作息、公区清洁和水电分摊规则是什么？");
  if (listing.riskFlags.some((risk) => risk.includes("视频看房"))) questions.push("视频看房后是否支持线下核验房屋、证件和合同主体？");
  if (questions.length === 0) questions.push("签约前确认房东身份、产权证明、费用明细和退租条款。");

  return {
    ...listing,
    score: Math.max(0, Math.min(99, score)),
    reasons: reasons.slice(0, 3),
    riskLevel,
    questions: questions.slice(0, 3),
  };
}

export function getRankedListings(listings: RentalListing[], criteria: SearchCriteria): ScoredListing[] {
  return filterListings(listings, criteria)
    .map((listing) => scoreListing(listing, criteria))
    .sort((a, b) => b.score - a.score || a.rent - b.rent);
}

export function buildSummary(listings: ScoredListing[]): string {
  if (listings.length === 0) return "当前筛选条件下没有匹配房源。";
  return listings
    .slice(0, 3)
    .map(
      (item, index) =>
        `${index + 1}. ${item.title}｜${item.rent} 元/月｜${item.district} ${item.community}｜匹配分 ${item.score}｜风险：${item.riskFlags.join("、") || "低"}`,
    )
    .join("\n");
}
