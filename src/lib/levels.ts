import type { SurfLevel } from "@/lib/types";
import { SURF_LEVELS } from "@/lib/types";

export function levelLabel(level: SurfLevel): string {
  const labels: Record<SurfLevel, string> = {
    advanced: "ショート",
    intermediate: "ミッド",
    beginner: "ロング",
  };

  return labels[level];
}

export function availableLevels(): SurfLevel[] {
  return [...SURF_LEVELS];
}
