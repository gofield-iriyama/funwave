import type { SupabaseClient } from "@supabase/supabase-js";

import { SPOT_SEEDS, STALE_LIMIT_HOURS } from "@/lib/constants";
import { createSupabaseAdminClient } from "@/lib/supabase-server";
import { formatJstTimeRange, hoursSince, toJstDateString } from "@/lib/time";
import type { DashboardData, SpotDashboardItem, SpotSeed, SurfLevel, SurfStatus } from "@/lib/types";

interface SpotRow {
  id: string;
  name_ja: string;
  latitude: number;
  longitude: number;
  sort_order: number;
}

interface RuntimeRow {
  spot_id: string;
  last_success_at: string | null;
  last_error_at: string | null;
  last_error_message: string | null;
}

interface EvaluationRow {
  spot_id: string;
  forecast_date: string;
  level: SurfLevel;
  status: SurfStatus;
  reason: string;
  score: number;
  best_slot_start: string | null;
  best_slot_end: string | null;
  updated_at: string;
}

export interface ForecastSlotUpsert {
  spot_id: string;
  forecast_date: string;
  slot_start: string;
  slot_end: string;
  wave_height_m: number;
  wave_period_s: number;
  wind_speed_ms: number;
  wind_direction_deg: number;
  score_beginner: number;
  score_intermediate: number;
  score_advanced: number;
  batch_id: string;
  source: string;
  created_at: string;
}

export interface DailyEvaluationUpsert {
  spot_id: string;
  forecast_date: string;
  level: SurfLevel;
  status: SurfStatus;
  reason: string;
  score: number;
  best_slot_start: string | null;
  best_slot_end: string | null;
  source: string;
  updated_at: string;
}

function fallbackData(nowIso = new Date().toISOString()): DashboardData {
  return {
    dateJst: toJstDateString(),
    generatedAt: nowIso,
    spots: SPOT_SEEDS.map((seed) => ({
      id: seed.id,
      nameJa: seed.nameJa,
      latitude: seed.latitude,
      longitude: seed.longitude,
      warnings: {
        hasUpdateError: false,
        errorMessage: null,
        isStale: true,
        hoursSinceSuccess: null,
        lastSuccessAt: null,
      },
      levels: {
        beginner: {
          decision: "unavailable",
          reason: "データ準備中です。",
          score: null,
          bestSlotLabel: null,
          updatedAt: null,
        },
        intermediate: {
          decision: "unavailable",
          reason: "データ準備中です。",
          score: null,
          bestSlotLabel: null,
          updatedAt: null,
        },
        advanced: {
          decision: "unavailable",
          reason: "データ準備中です。",
          score: null,
          bestSlotLabel: null,
          updatedAt: null,
        },
      },
    })),
  };
}

function offshoreDirectionForSpot(spotId: string): number {
  const seed = SPOT_SEEDS.find((spot) => spot.id === spotId);
  return seed?.offshoreDirectionDeg ?? 350;
}

export async function seedSpots(client: SupabaseClient): Promise<void> {
  const { error } = await client.from("spots").upsert(
    SPOT_SEEDS.map((spot) => ({
      id: spot.id,
      name_ja: spot.nameJa,
      latitude: spot.latitude,
      longitude: spot.longitude,
      sort_order: spot.sortOrder,
    })),
    {
      onConflict: "id",
    },
  );

  if (error) {
    throw new Error(`spots seedに失敗しました: ${error.message}`);
  }
}

export async function getActiveSpots(client: SupabaseClient): Promise<SpotSeed[]> {
  const { data, error } = await client
    .from("spots")
    .select("id,name_ja,latitude,longitude,sort_order")
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(`spots取得に失敗しました: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return SPOT_SEEDS;
  }

  return (data as SpotRow[]).map((row) => ({
    id: row.id,
    nameJa: row.name_ja,
    latitude: row.latitude,
    longitude: row.longitude,
    offshoreDirectionDeg: offshoreDirectionForSpot(row.id),
    sortOrder: row.sort_order,
  }));
}

export async function upsertForecastSlots(
  client: SupabaseClient,
  rows: ForecastSlotUpsert[],
): Promise<void> {
  if (rows.length === 0) {
    return;
  }

  const { error } = await client.from("forecast_slots").upsert(rows, {
    onConflict: "spot_id,slot_start",
  });

  if (error) {
    throw new Error(`forecast_slots保存に失敗しました: ${error.message}`);
  }
}

export async function upsertDailyEvaluations(
  client: SupabaseClient,
  rows: DailyEvaluationUpsert[],
): Promise<void> {
  if (rows.length === 0) {
    return;
  }

  const { error } = await client.from("daily_evaluations").upsert(rows, {
    onConflict: "spot_id,forecast_date,level",
  });

  if (error) {
    throw new Error(`daily_evaluations保存に失敗しました: ${error.message}`);
  }
}

export async function markSpotSuccess(
  client: SupabaseClient,
  params: { spotId: string; batchId: string; timestampIso: string },
): Promise<void> {
  const { error } = await client.from("spot_runtime_status").upsert(
    {
      spot_id: params.spotId,
      last_success_at: params.timestampIso,
      last_error_at: null,
      last_error_message: null,
      last_batch_id: params.batchId,
      updated_at: params.timestampIso,
    },
    { onConflict: "spot_id" },
  );

  if (error) {
    throw new Error(`spot_runtime_status更新(成功)に失敗しました: ${error.message}`);
  }
}

export async function markSpotError(
  client: SupabaseClient,
  params: { spotId: string; batchId: string; timestampIso: string; errorMessage: string },
): Promise<void> {
  const { error } = await client.from("spot_runtime_status").upsert(
    {
      spot_id: params.spotId,
      last_error_at: params.timestampIso,
      last_error_message: params.errorMessage,
      last_batch_id: params.batchId,
      updated_at: params.timestampIso,
    },
    { onConflict: "spot_id" },
  );

  if (error) {
    throw new Error(`spot_runtime_status更新(失敗)に失敗しました: ${error.message}`);
  }
}

function buildSpotDashboard(
  spot: SpotSeed,
  runtimeMap: Map<string, RuntimeRow>,
  evalMap: Map<string, EvaluationRow>,
  now = new Date(),
): SpotDashboardItem {
  const runtime = runtimeMap.get(spot.id);

  const lastSuccessAt = runtime?.last_success_at ?? null;
  const hoursSinceSuccessValue = lastSuccessAt ? hoursSince(lastSuccessAt, now) : null;
  const isStale =
    hoursSinceSuccessValue == null ? true : Number(hoursSinceSuccessValue.toFixed(2)) > STALE_LIMIT_HOURS;
  const hasUpdateError = Boolean(
    runtime?.last_error_at &&
      (!runtime.last_success_at ||
        new Date(runtime.last_error_at).getTime() > new Date(runtime.last_success_at).getTime()),
  );

  return {
    id: spot.id,
    nameJa: spot.nameJa,
    latitude: spot.latitude,
    longitude: spot.longitude,
    warnings: {
      hasUpdateError,
      errorMessage: runtime?.last_error_message ?? null,
      isStale,
      hoursSinceSuccess:
        hoursSinceSuccessValue == null ? null : Number(hoursSinceSuccessValue.toFixed(1)),
      lastSuccessAt,
    },
    levels: {
      beginner: buildLevelView(spot.id, "beginner", evalMap),
      intermediate: buildLevelView(spot.id, "intermediate", evalMap),
      advanced: buildLevelView(spot.id, "advanced", evalMap),
    },
  };
}

function buildLevelView(
  spotId: string,
  level: SurfLevel,
  evalMap: Map<string, EvaluationRow>,
): SpotDashboardItem["levels"][SurfLevel] {
  const row = evalMap.get(`${spotId}:${level}`);

  if (!row) {
    return {
      decision: "unavailable",
      reason: "データ準備中です。",
      score: null,
      bestSlotLabel: null,
      updatedAt: null,
    };
  }

  return {
    decision: row.status,
    reason: row.reason,
    score: row.score,
    bestSlotLabel:
      row.best_slot_start && row.best_slot_end
        ? formatJstTimeRange(row.best_slot_start, row.best_slot_end)
        : null,
    updatedAt: row.updated_at,
  };
}

export async function getDashboardData(): Promise<DashboardData> {
  try {
    const client = createSupabaseAdminClient();

    await seedSpots(client);

    const [spotsResult, runtimeResult, evaluationsResult] = await Promise.all([
      client
        .from("spots")
        .select("id,name_ja,latitude,longitude,sort_order")
        .order("sort_order", { ascending: true }),
      client
        .from("spot_runtime_status")
        .select("spot_id,last_success_at,last_error_at,last_error_message"),
      client
        .from("daily_evaluations")
        .select("spot_id,forecast_date,level,status,reason,score,best_slot_start,best_slot_end,updated_at")
        .order("forecast_date", { ascending: false })
        .order("updated_at", { ascending: false }),
    ]);

    if (spotsResult.error) {
      throw new Error(spotsResult.error.message);
    }
    if (runtimeResult.error) {
      throw new Error(runtimeResult.error.message);
    }
    if (evaluationsResult.error) {
      throw new Error(evaluationsResult.error.message);
    }

    const spotsRaw = (spotsResult.data as SpotRow[]) ?? [];
    const spots: SpotSeed[] =
      spotsRaw.length > 0
        ? spotsRaw.map((spot) => ({
            id: spot.id,
            nameJa: spot.name_ja,
            latitude: spot.latitude,
            longitude: spot.longitude,
            offshoreDirectionDeg: offshoreDirectionForSpot(spot.id),
            sortOrder: spot.sort_order,
          }))
        : SPOT_SEEDS;

    const runtimeMap = new Map<string, RuntimeRow>();
    ((runtimeResult.data as RuntimeRow[]) ?? []).forEach((runtime) => {
      runtimeMap.set(runtime.spot_id, runtime);
    });

    const evalMap = new Map<string, EvaluationRow>();
    ((evaluationsResult.data as EvaluationRow[]) ?? []).forEach((row) => {
      const key = `${row.spot_id}:${row.level}`;
      if (!evalMap.has(key)) {
        evalMap.set(key, row);
      }
    });

    const now = new Date();

    return {
      dateJst: toJstDateString(now),
      generatedAt: now.toISOString(),
      spots: spots.map((spot) => buildSpotDashboard(spot, runtimeMap, evalMap, now)),
    };
  } catch {
    return fallbackData();
  }
}
