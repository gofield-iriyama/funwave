import { SPOT_SEEDS, THRESHOLDS } from "@/lib/constants";
import type {
  DailyLevelEvaluation,
  SlotAggregate,
  SlotLevelEvaluation,
  SurfLevel,
  SurfStatus,
} from "@/lib/types";

function rangeScore(value: number, min: number, max: number, grace: number): number {
  if (value >= min && value <= max) {
    return 1;
  }

  if (value >= min - grace && value <= max + grace) {
    return 0.5;
  }

  return 0;
}

function upperBoundScore(value: number, max: number, grace: number): number {
  if (value <= max) {
    return 1;
  }

  if (value <= max + grace) {
    return 0.5;
  }

  return 0;
}

function circularDiff(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

function windDirectionScore(spotId: string, windDirectionDeg: number): number {
  const spot = SPOT_SEEDS.find((item) => item.id === spotId);
  const offshoreDirection = spot?.offshoreDirectionDeg ?? 350;
  const offshoreDiff = circularDiff(windDirectionDeg, offshoreDirection);
  const onshoreDiff = circularDiff(windDirectionDeg, (offshoreDirection + 180) % 360);

  if (onshoreDiff <= 25) {
    return 0;
  }
  if (offshoreDiff <= 50) {
    return 1;
  }
  if (offshoreDiff <= 80) {
    return 0.7;
  }
  if (offshoreDiff <= 110) {
    return 0.4;
  }
  return 0.2;
}

function statusFromScore(score: number, hardFail: boolean): SurfStatus {
  // 2段階判定:
  // - hardFailなら即 "tough"
  // - それ以外は総合スコア2.2以上で "go"
  if (hardFail) {
    return "tough";
  }

  return score >= 2.2 ? "go" : "tough";
}

function reasonFor(level: SurfLevel, slot: SlotAggregate, score: number, hardFail: boolean): string {
  const threshold = THRESHOLDS[level];

  if (hardFail && slot.windSpeedMs > threshold.windSpeedMax + threshold.windGrace + 1.5) {
    return "風が強すぎるため厳しいです。";
  }

  const windDirScore = windDirectionScore(slot.spotId, slot.windDirectionDeg);
  if (hardFail && windDirScore <= 0.2 && slot.windSpeedMs >= 4.5) {
    return "オンショア気味で面が崩れやすいです。";
  }

  if (hardFail && slot.waveHeightM > threshold.waveHeightMax + threshold.waveGrace + 0.5) {
    return "波が大きすぎるため厳しいです。";
  }

  if (score >= 2) {
    return "波・周期・風のバランスが良いです。";
  }

  if (slot.waveHeightM < threshold.waveHeightMin - threshold.waveGrace) {
    return "波が小さくパワー不足です。";
  }

  if (slot.wavePeriodS < threshold.periodMin - threshold.periodGrace) {
    return "周期が短くまとまりに欠けます。";
  }

  if (slot.windSpeedMs > threshold.windSpeedMax + threshold.windGrace) {
    return "風がやや強く面が乱れやすいです。";
  }

  if (windDirScore <= 0.4) {
    return "風向きが合わず面がまとまりにくいです。";
  }

  return "条件が安定せず厳しめです。";
}

export function evaluateSlot(level: SurfLevel, slot: SlotAggregate): SlotLevelEvaluation {
  const threshold = THRESHOLDS[level];

  const wave = rangeScore(
    slot.waveHeightM,
    threshold.waveHeightMin,
    threshold.waveHeightMax,
    threshold.waveGrace,
  );
  const period = rangeScore(
    slot.wavePeriodS,
    threshold.periodMin,
    threshold.periodMax,
    threshold.periodGrace,
  );
  const windSpeedScore = upperBoundScore(slot.windSpeedMs, threshold.windSpeedMax, threshold.windGrace);
  const windDirScore = windDirectionScore(slot.spotId, slot.windDirectionDeg);
  const wind = Number(Math.min(windSpeedScore, windDirScore).toFixed(2));

  const score = Number((wave + period + wind).toFixed(2));
  const hardFail =
    slot.windSpeedMs > threshold.windSpeedMax + threshold.windGrace + 1.5 ||
    slot.waveHeightM > threshold.waveHeightMax + threshold.waveGrace + 0.5 ||
    (windDirScore <= 0.2 && slot.windSpeedMs >= 4.5);

  return {
    level,
    score,
    status: statusFromScore(score, hardFail),
    reason: reasonFor(level, slot, score, hardFail),
  };
}

export function evaluateDaily(level: SurfLevel, slots: SlotAggregate[]): DailyLevelEvaluation {
  if (slots.length === 0) {
    return {
      level,
      status: "tough",
      reason: "有効な予報データが不足しています。",
      score: 0,
      bestSlotStartIso: null,
      bestSlotEndIso: null,
    };
  }

  const evaluated = slots
    .map((slot) => ({
      slot,
      result: evaluateSlot(level, slot),
    }))
    .sort((a, b) => b.result.score - a.result.score);

  const best = evaluated[0];

  return {
    level,
    status: best.result.status,
    reason: best.result.reason,
    score: best.result.score,
    bestSlotStartIso: best.slot.slotStartIso,
    bestSlotEndIso: best.slot.slotEndIso,
  };
}
