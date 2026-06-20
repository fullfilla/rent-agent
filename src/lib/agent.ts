import { AgentStep, ChatMessage, RentalListing, SearchCriteria } from "./types";
import { getRankedListings } from "./scoring";

export interface AgentResult {
  criteria: SearchCriteria;
  message: ChatMessage;
  steps: AgentStep[];
}

const districtWords = ["朝阳", "海淀", "丰台", "浦东"];

function parseBudget(message: string, current: SearchCriteria): Partial<SearchCriteria> {
  const next: Partial<SearchCriteria> = {};
  const budgetMatch = message.match(/(\d{3,5})\s*(?:元|块|以内|以下|预算|左右)?/);
  if (budgetMatch) {
    const value = Number(budgetMatch[1]);
    if (value >= 1000 && (message.includes("降") || message.includes("以内") || message.includes("以下") || message.includes("预算") || value > current.budgetMax)) {
      next.budgetMax = value;
    }
  }
  return next;
}

function parseCriteria(message: string, current: SearchCriteria): SearchCriteria {
  const next: SearchCriteria = { ...current, districts: [...current.districts], features: [...current.features] };
  Object.assign(next, parseBudget(message, current));

  if (message.includes("上海") || message.includes("张江") || message.includes("浦东")) {
    next.city = "上海";
    next.districts = message.includes("浦东") || message.includes("张江") ? ["浦东"] : [];
  }
  if (message.includes("北京") || message.includes("望京") || message.includes("知春路") || message.includes("宋家庄")) next.city = "北京";

  const districts = districtWords.filter((district) => message.includes(district));
  if (message.includes("望京") && !districts.includes("朝阳")) districts.push("朝阳");
  if (message.includes("知春路") && !districts.includes("海淀")) districts.push("海淀");
  if (message.includes("宋家庄") && !districts.includes("丰台")) districts.push("丰台");
  if (districts.length > 0) next.districts = Array.from(new Set(districts));

  if (message.includes("一居") || message.includes("1居")) next.rooms = "一居";
  if (message.includes("两居") || message.includes("2居")) next.rooms = "两居";
  if (message.includes("三居") || message.includes("3居")) next.rooms = "三居及以上";
  if (message.includes("开间")) next.rooms = "开间";

  if (message.includes("整租") || message.includes("独住") || message.includes("不要合租") || message.includes("不合租")) next.rentalType = "整租";
  if (message.includes("合租") && !message.includes("不要合租") && !message.includes("不合租")) next.rentalType = "合租";
  if (message.includes("南北")) next.orientation = "南北";
  else if (message.includes("南向")) next.orientation = "南";

  if (message.includes("月付")) next.payPreference = "月付";
  if (message.includes("季付")) next.payPreference = "季付";
  if (message.includes("半年付")) next.payPreference = "半年付";

  if (message.includes("地铁")) {
    if (message.includes("500") || message.includes("五百")) next.maxSubwayDistance = 500;
    else if (message.includes("800") || message.includes("八百")) next.maxSubwayDistance = 800;
    else next.maxSubwayDistance = Math.min(next.maxSubwayDistance, 1000);
  }
  if (message.includes("远一点") || message.includes("远点")) next.maxCommuteMinutes = Math.max(next.maxCommuteMinutes, 60);
  if (message.includes("近一点") || message.includes("通勤短")) next.maxCommuteMinutes = Math.min(next.maxCommuteMinutes, 35);
  if (message.includes("电梯")) next.mustHaveElevator = true;
  if (message.includes("宠物") || message.includes("养猫") || message.includes("养狗")) next.allowPets = true;
  if (message.includes("民水民电") && !next.features.includes("民水民电")) next.features.push("民水民电");
  if (message.includes("不要转租") || message.includes("不要隔断") || message.includes("坑") || message.includes("安全")) next.excludeHighRisk = true;
  if (message.includes("可以看高风险") || message.includes("先都看看")) next.excludeHighRisk = false;

  return next;
}

function describeChanges(before: SearchCriteria, after: SearchCriteria): string {
  const changes: string[] = [];
  if (before.city !== after.city) changes.push(`城市：${after.city}`);
  if (before.districts.join(",") !== after.districts.join(",")) changes.push(`区域：${after.districts.join("、") || "不限"}`);
  if (before.budgetMax !== after.budgetMax) changes.push(`预算上限：${after.budgetMax} 元`);
  if (before.rooms !== after.rooms) changes.push(`户型：${after.rooms}`);
  if (before.rentalType !== after.rentalType) changes.push(`租住方式：${after.rentalType}`);
  if (before.maxSubwayDistance !== after.maxSubwayDistance) changes.push(`地铁距离：${after.maxSubwayDistance} 米内`);
  if (before.maxCommuteMinutes !== after.maxCommuteMinutes) changes.push(`通勤：${after.maxCommuteMinutes} 分钟内`);
  if (before.features.join(",") !== after.features.join(",")) changes.push(`特色：${after.features.join("、") || "不限"}`);
  if (before.excludeHighRisk !== after.excludeHighRisk) changes.push(after.excludeHighRisk ? "排除高风险房源" : "允许展示高风险房源");
  return changes.length ? changes.join("；") : "本轮没有识别到新的硬条件，沿用当前筛选。";
}

export function runMockAgent(userMessage: string, currentCriteria: SearchCriteria, listings: RentalListing[]): AgentResult {
  const nextCriteria = parseCriteria(userMessage, currentCriteria);
  const ranked = getRankedListings(listings, nextCriteria);
  const topRisks = Array.from(new Set(ranked.flatMap((item) => item.riskFlags))).slice(0, 4);
  const changes = describeChanges(currentCriteria, nextCriteria);

  const content =
    ranked.length > 0
      ? `我按你的新需求更新了筛选：${changes}。当前找到 ${ranked.length} 套候选，优先看 ${ranked[0].community} 这套，匹配分 ${ranked[0].score}。重点留意：${topRisks.join("、") || "暂无明显高风险"}。`
      : `我已更新筛选：${changes}。但当前没有匹配房源，建议放宽预算、区域或通勤条件。`;

  return {
    criteria: nextCriteria,
    message: {
      id: crypto.randomUUID(),
      role: "agent",
      content,
      createdAt: new Date().toISOString(),
    },
    steps: [
      { title: "解析需求", detail: `识别到：${changes}`, status: "done" },
      {
        title: "更新筛选",
        detail: `${nextCriteria.city}｜${nextCriteria.districts.join("、") || "不限区域"}｜${nextCriteria.budgetMin}-${nextCriteria.budgetMax} 元`,
        status: "done",
      },
      { title: "匹配排序", detail: `候选 ${ranked.length} 套，按预算、地铁、通勤、风险综合排序`, status: "done" },
      { title: "风险检查", detail: topRisks.length ? topRisks.join("、") : "未发现明显高风险标签", status: "done" },
    ],
  };
}
