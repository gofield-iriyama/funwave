import { THRESHOLDS } from "@/lib/constants";
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

function statusFromScore(score: number, hardFail: boolean): SurfStatus {
  if (hardFail) {
    return "tough";
  }

  return score >= 2 ? "go" : "tough";
}

function reasonFor(level: SurfLevel, slot: SlotAggregate, score: number, hardFail: boolean): string {
  const threshold = THRESHOLDS[level];

  if (hardFail && slot.windSpeedMs > threshold.windSpeedMax + threshold.windGrace + 1.5) {
    return "風が強すぎるため厳しいです。";
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
  const wind = upperBoundScore(slot.windSpeedMs, threshold.windSpeedMax, threshold.windGrace);

  const score = Number((wave + period + wind).toFixed(2));
  const hardFail =
    slot.windSpeedMs > threshold.windSpeedMax + threshold.windGrace + 1.5 ||
    slot.waveHeightM > threshold.waveHeightMax + threshold.waveGrace + 0.5;

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
