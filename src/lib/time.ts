const JST = "Asia/Tokyo";

export function toJstDateString(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: JST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    throw new Error("JST日付の生成に失敗しました");
  }

  return `${year}-${month}-${day}`;
}

export function buildJstIso(dateJst: string, hour: number): string {
  const paddedHour = String(hour).padStart(2, "0");
  return `${dateJst}T${paddedHour}:00:00+09:00`;
}

export function formatJstTimeRange(startIso: string, endIso: string): string {
  const formatter = new Intl.DateTimeFormat("ja-JP", {
    timeZone: JST,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return `${formatter.format(new Date(startIso))} - ${formatter.format(new Date(endIso))}`;
}

export function hoursSince(iso: string, now = new Date()): number {
  const diffMs = now.getTime() - new Date(iso).getTime();
  return Math.max(0, diffMs / (1000 * 60 * 60));
}
