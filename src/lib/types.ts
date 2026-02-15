// UI表示順: ショート -> ミッド -> ロング
// 内部キーは既存DB互換のため維持
export const SURF_LEVELS = ["advanced", "intermediate", "beginner"] as const;

export type SurfLevel = (typeof SURF_LEVELS)[number];
export type SurfStatus = "go" | "mellow" | "tough";
export type SpotDecision = SurfStatus | "unavailable";

export interface SpotSeed {
  id: string;
  nameJa: string;
  latitude: number;
  longitude: number;
  offshoreDirectionDeg: number;
  sortOrder: number;
}

export interface Threshold {
  waveHeightMin: number;
  waveHeightMax: number;
  waveGrace: number;
  periodMin: number;
  periodMax: number;
  periodGrace: number;
  windSpeedMax: number;
  windGrace: number;
}

export interface SlotAggregate {
  spotId: string;
  forecastDate: string;
  slotStartIso: string;
  slotEndIso: string;
  waveHeightM: number;
  wavePeriodS: number;
  windSpeedMs: number;
  windDirectionDeg: number;
}

export interface SlotLevelEvaluation {
  level: SurfLevel;
  score: number;
  status: SurfStatus;
  reason: string;
}

export interface DailyLevelEvaluation {
  level: SurfLevel;
  status: SurfStatus;
  reason: string;
  score: number;
  bestSlotStartIso: string | null;
  bestSlotEndIso: string | null;
}

export interface SpotWarnings {
  hasUpdateError: boolean;
  errorMessage: string | null;
  isStale: boolean;
  hoursSinceSuccess: number | null;
  lastSuccessAt: string | null;
}

export interface SpotLevelView {
  decision: SpotDecision;
  reason: string;
  score: number | null;
  bestSlotLabel: string | null;
  updatedAt: string | null;
}

export interface SpotDashboardItem {
  id: string;
  nameJa: string;
  latitude: number;
  longitude: number;
  warnings: SpotWarnings;
  levels: Record<SurfLevel, SpotLevelView>;
}

export interface DashboardData {
  dateJst: string;
  generatedAt: string;
  spots: SpotDashboardItem[];
}
