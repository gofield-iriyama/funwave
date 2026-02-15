"use client";

import { useMemo, useState } from "react";

import { getDictionary } from "@/i18n";
import { availableLevels, levelLabel } from "@/lib/levels";
import type { DashboardData, SpotDecision, SurfLevel } from "@/lib/types";

interface SurfDashboardProps {
  data: DashboardData;
}

const DECISION_CLASS: Record<SpotDecision, string> = {
  go: "bg-emerald-500 text-emerald-50",
  mellow: "bg-cyan-400 text-cyan-950",
  tough: "bg-rose-500 text-rose-50",
  unavailable: "bg-slate-400 text-slate-50",
};

function decisionText(decision: SpotDecision): string {
  const dict = getDictionary();
  if (decision === "go") {
    return dict.decisionGo;
  }
  if (decision === "mellow") {
    return dict.decisionMellow;
  }
  if (decision === "tough") {
    return dict.decisionTough;
  }
  return dict.decisionUnavailable;
}

function formatJstDateTime(iso: string | null): string {
  if (!iso) {
    return "-";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export function SurfDashboard({ data }: SurfDashboardProps) {
  const dict = getDictionary();
  const levels = availableLevels();

  const [selectedSpotId, setSelectedSpotId] = useState(data.spots[0]?.id ?? "");
  const [selectedLevel, setSelectedLevel] = useState<SurfLevel>("intermediate");

  const selectedSpot = useMemo(
    () => data.spots.find((spot) => spot.id === selectedSpotId) ?? data.spots[0],
    [data.spots, selectedSpotId],
  );

  if (!selectedSpot) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center text-slate-100">
        データがまだありません。バッチ更新後に表示されます。
      </div>
    );
  }

  const view = selectedSpot.levels[selectedLevel];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_15%_20%,#2563eb40,transparent_45%),radial-gradient(circle_at_85%_0%,#14b8a640,transparent_35%),linear-gradient(160deg,#022c43_0%,#0b3a53_35%,#0f766e_100%)] text-slate-100">
      <div className="pointer-events-none absolute inset-0 opacity-20 [background:repeating-linear-gradient(135deg,transparent_0,transparent_12px,rgba(255,255,255,0.12)_13px,transparent_14px)]" />

      <main className="relative mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-8">
        <header className="rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur">
          <h1 className="text-2xl font-semibold tracking-wide sm:text-3xl">{dict.appTitle}</h1>
          <p className="mt-2 text-sm text-cyan-100/90">{dict.appSubtitle}</p>
          <p className="mt-4 text-xs text-cyan-100/80">
            {dict.generatedAt}: {formatJstDateTime(data.generatedAt)}
          </p>
        </header>

        <section className="rounded-3xl border border-white/20 bg-white/10 p-4 backdrop-blur sm:p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-100/80">{dict.levelLabel}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {levels.map((level) => {
              const active = selectedLevel === level;
              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => setSelectedLevel(level)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-cyan-300 text-cyan-900"
                      : "border border-cyan-100/50 bg-cyan-900/30 text-cyan-50 hover:bg-cyan-800/60"
                  }`}
                >
                  {levelLabel(level)}
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-white/20 bg-white/10 p-4 backdrop-blur sm:p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-cyan-100/80">{dict.spotLabel}</p>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {data.spots.map((spot) => {
              const active = selectedSpot.id === spot.id;
              return (
                <button
                  key={spot.id}
                  type="button"
                  onClick={() => setSelectedSpotId(spot.id)}
                  className={`rounded-2xl border px-4 py-3 text-left transition ${
                    active
                      ? "border-cyan-200 bg-cyan-100/90 text-cyan-950"
                      : "border-cyan-100/40 bg-cyan-900/20 text-cyan-50 hover:bg-cyan-800/50"
                  }`}
                >
                  <p className="text-lg font-semibold">{spot.nameJa}</p>
                  <p className="text-xs opacity-80">
                    {spot.latitude.toFixed(3)}, {spot.longitude.toFixed(3)}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-white/20 bg-white/10 p-5 backdrop-blur sm:p-7">
          <div className="flex flex-wrap items-center gap-4">
            <span className={`rounded-full px-5 py-2 text-lg font-bold ${DECISION_CLASS[view.decision]}`}>
              {decisionText(view.decision)}
            </span>
            <p className="text-sm text-cyan-100/90">
              {dict.bestTimeLabel}: {view.bestSlotLabel ?? dict.noBestTime}
            </p>
            <p className="text-sm text-cyan-100/90">
              {dict.scoreLabel}: {view.score == null ? "-" : view.score.toFixed(2)}
            </p>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-950/35 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-100/80">{dict.reasonLabel}</p>
              <p className="mt-2 text-sm text-cyan-50">{view.reason}</p>
            </div>
            <div className="rounded-2xl bg-slate-950/35 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-100/80">{dict.lastUpdated}</p>
              <p className="mt-2 text-sm text-cyan-50">{formatJstDateTime(view.updatedAt)}</p>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2 text-sm">
            {selectedSpot.warnings.hasUpdateError ? (
              <p className="rounded-xl border border-amber-200/30 bg-amber-500/20 px-3 py-2 text-amber-100">
                {dict.updateErrorWarning}
                {selectedSpot.warnings.errorMessage ? ` (${selectedSpot.warnings.errorMessage})` : ""}
              </p>
            ) : null}
            {selectedSpot.warnings.isStale ? (
              <p className="rounded-xl border border-rose-200/30 bg-rose-500/20 px-3 py-2 text-rose-100">
                {dict.staleWarning}
                {selectedSpot.warnings.hoursSinceSuccess != null
                  ? ` (${selectedSpot.warnings.hoursSinceSuccess}時間経過)`
                  : ""}
              </p>
            ) : null}
            {(selectedSpot.warnings.hasUpdateError || selectedSpot.warnings.isStale) && (
              <p className="text-xs text-cyan-100/80">{dict.retryHint}</p>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
