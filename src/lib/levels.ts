import type { SurfLevel } from "@/lib/types";
import { SURF_LEVELS } from "@/lib/types";

export function levelLabel(level: SurfLevel): string {
  const labels: Record<SurfLevel, string> = {
    beginner: "初心者",
    intermediate: "中級者",
    advanced: "上級者",
  };

  return labels[level];
}

export function availableLevels(): SurfLevel[] {
  return [...SURF_LEVELS];
}
