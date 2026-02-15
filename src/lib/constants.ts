import type { SpotSeed, SurfLevel, Threshold } from "@/lib/types";

export const STALE_LIMIT_HOURS = 6;

export const SPOT_SEEDS: SpotSeed[] = [
  {
    id: "komatsu",
    nameJa: "小松",
    latitude: 34.085,
    longitude: 134.613,
    sortOrder: 1,
  },
  {
    id: "ikumi",
    nameJa: "生見",
    latitude: 33.558,
    longitude: 134.303,
    sortOrder: 2,
  },
  {
    id: "ukibuchi",
    nameJa: "浮鞭",
    latitude: 33.021,
    longitude: 133.078,
    sortOrder: 3,
  },
];

export const THRESHOLDS: Record<SurfLevel, Threshold> = {
  beginner: {
    waveHeightMin: 0.6,
    waveHeightMax: 1.2,
    waveGrace: 0.2,
    periodMin: 7,
    periodMax: 11,
    periodGrace: 1,
    windSpeedMax: 6,
    windGrace: 1.5,
  },
  intermediate: {
    waveHeightMin: 0.8,
    waveHeightMax: 1.8,
    waveGrace: 0.3,
    periodMin: 8,
    periodMax: 13,
    periodGrace: 1.5,
    windSpeedMax: 8,
    windGrace: 2,
  },
  advanced: {
    waveHeightMin: 1.2,
    waveHeightMax: 2.5,
    waveGrace: 0.35,
    periodMin: 9,
    periodMax: 16,
    periodGrace: 2,
    windSpeedMax: 10,
    windGrace: 2.5,
  },
};
