import type { SpotSeed, SurfLevel, Threshold } from "@/lib/types";

export const STALE_LIMIT_HOURS = 6;

export const SPOT_SEEDS: SpotSeed[] = [
  {
    id: "komatsu",
    nameJa: "小松",
    latitude: 34.085,
    longitude: 134.613,
    offshoreDirectionDeg: 320,
    sortOrder: 1,
  },
  {
    id: "ikumi",
    nameJa: "生見",
    latitude: 33.558,
    longitude: 134.303,
    offshoreDirectionDeg: 320,
    sortOrder: 2,
  },
  {
    id: "ukibuchi",
    nameJa: "浮鞭",
    latitude: 33.021,
    longitude: 133.078,
    offshoreDirectionDeg: 335,
    sortOrder: 3,
  },
];

export const THRESHOLDS: Record<SurfLevel, Threshold> = {
  // ロングボード向け
  beginner: {
    waveHeightMin: 0.45,
    waveHeightMax: 1.35,
    waveGrace: 0.2,
    periodMin: 6,
    periodMax: 12,
    periodGrace: 1,
    windSpeedMax: 6.5,
    windGrace: 1.3,
  },
  // ミッドレングス向け
  intermediate: {
    waveHeightMin: 0.65,
    waveHeightMax: 1.95,
    waveGrace: 0.25,
    periodMin: 7,
    periodMax: 14,
    periodGrace: 1.5,
    windSpeedMax: 7.5,
    windGrace: 1.7,
  },
  // ショートボード向け
  advanced: {
    waveHeightMin: 0.9,
    waveHeightMax: 2.6,
    waveGrace: 0.35,
    periodMin: 8,
    periodMax: 16,
    periodGrace: 2,
    windSpeedMax: 8.5,
    windGrace: 2,
  },
};
