export type RentalType = "整租" | "合租" | "不限";
export type RoomType = "不限" | "开间" | "一居" | "两居" | "三居及以上";
export type RiskLevel = "低" | "中" | "高";
export type Orientation = "不限" | "南北" | "南" | "东" | "西" | "北";
export type FloorPreference = "不限" | "低楼层" | "中楼层" | "高楼层";
export type PayPreference = "不限" | "月付" | "季付" | "半年付";

export interface RentalListing {
  id: string;
  title: string;
  source: string;
  city: string;
  district: string;
  community: string;
  address: string;
  rent: number;
  depositMonths: number;
  payMonths: number;
  rooms: Exclude<RoomType, "不限">;
  rentalType: Exclude<RentalType, "不限">;
  area: number;
  floor: string;
  floorLevel: Exclude<FloorPreference, "不限">;
  hasElevator: boolean;
  allowPets: boolean;
  subwayDistance: number;
  commuteMinutes: number;
  orientation: Exclude<Orientation, "不限">;
  tags: string[];
  riskFlags: string[];
  description: string;
  lat: number;
  lng: number;
  updatedAt: string;
  isNew?: boolean;
}

export interface SearchCriteria {
  city: string;
  districts: string[];
  budgetMin: number;
  budgetMax: number;
  rooms: RoomType;
  rentalType: RentalType;
  areaMin: number;
  areaMax: number;
  orientation: Orientation;
  floorPreference: FloorPreference;
  payPreference: PayPreference;
  maxSubwayDistance: number;
  maxCommuteMinutes: number;
  mustHaveElevator: boolean;
  allowPets: boolean;
  excludeHighRisk: boolean;
  features: string[];
  keywords: string;
}

export interface ModelConfig {
  providerName: string;
  baseUrl: string;
  apiKey: string;
  modelName: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "agent";
  content: string;
  createdAt: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  criteria: SearchCriteria;
  shortMemory: string[];
  summary: string;
  createdAt: string;
  updatedAt: string;
  pinned?: boolean;
}

export interface UserProfile {
  cities: string[];
  districts: string[];
  budgetMin?: number;
  budgetMax?: number;
  rentalType?: RentalType;
  rooms?: RoomType;
  commutePreference?: string;
  riskPreference?: string;
  petPreference?: string;
  updatedAt?: string;
}

export interface MemoryState {
  midTermSummaries: string[];
  longTermProfile: UserProfile;
}

export interface AgentStep {
  title: string;
  detail: string;
  status: "done" | "running";
}

export interface ScoredListing extends RentalListing {
  score: number;
  reasons: string[];
  riskLevel: RiskLevel;
  questions: string[];
}
