import { NextResponse } from "next/server";

import { evaluateDaily, evaluateSlot } from "@/lib/evaluation";
import { fetchSpotSlots } from "@/lib/open-meteo";
import {
  getActiveSpots,
  markSpotError,
  markSpotSuccess,
  seedSpots,
  upsertDailyEvaluations,
  upsertForecastSlots,
} from "@/lib/repository";
import { createSupabaseAdminClient } from "@/lib/supabase-server";
import { toJstDateString } from "@/lib/time";
import { SURF_LEVELS } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(req: Request): boolean {
  const cronHeader = req.headers.get("x-vercel-cron");
  if (cronHeader === "1") {
    return true;
  }

  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return true;
  }

  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const client = createSupabaseAdminClient();
    const batchId = crypto.randomUUID();
    const nowIso = new Date().toISOString();
    const targetDateJst = toJstDateString();

    await seedSpots(client);
    const spots = await getActiveSpots(client);

    const results: Array<{ spotId: string; ok: boolean; message: string }> = [];

    for (const spot of spots) {
      try {
        const slots = await fetchSpotSlots(spot, targetDateJst);

        if (slots.length === 0) {
          throw new Error("有効な時間帯データが0件でした");
        }

        const forecastRows = slots.map((slot) => {
          const beginner = evaluateSlot("beginner", slot);
          const intermediate = evaluateSlot("intermediate", slot);
          const advanced = evaluateSlot("advanced", slot);

          return {
            spot_id: slot.spotId,
            forecast_date: slot.forecastDate,
            slot_start: slot.slotStartIso,
            slot_end: slot.slotEndIso,
            wave_height_m: slot.waveHeightM,
            wave_period_s: slot.wavePeriodS,
            wind_speed_ms: slot.windSpeedMs,
            wind_direction_deg: slot.windDirectionDeg,
            score_beginner: beginner.score,
            score_intermediate: intermediate.score,
            score_advanced: advanced.score,
            batch_id: batchId,
            source: "open-meteo",
            created_at: nowIso,
          };
        });

        await upsertForecastSlots(client, forecastRows);

      const dailyRows = SURF_LEVELS.map((level) => {
        const daily = evaluateDaily(level, slots);
        const storedStatus = daily.status === "mellow" ? "go" : daily.status;

        return {
          spot_id: spot.id,
          forecast_date: targetDateJst,
          level,
          status: storedStatus,
          reason: daily.reason,
          score: daily.score,
          best_slot_start: daily.bestSlotStartIso,
            best_slot_end: daily.bestSlotEndIso,
            source: "open-meteo",
            updated_at: nowIso,
          };
        });

        await upsertDailyEvaluations(client, dailyRows);
        await markSpotSuccess(client, { spotId: spot.id, batchId, timestampIso: nowIso });

        results.push({
          spotId: spot.id,
          ok: true,
          message: `${slots.length}スロットを保存しました`,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "unknown error";

        await markSpotError(client, {
          spotId: spot.id,
          batchId,
          timestampIso: nowIso,
          errorMessage: message,
        });

        results.push({
          spotId: spot.id,
          ok: false,
          message,
        });
      }
    }

    const failedCount = results.filter((result) => !result.ok).length;

    return NextResponse.json(
      {
        ok: failedCount === 0,
        batchId,
        targetDateJst,
        results,
      },
      { status: failedCount === 0 ? 200 : 207 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return NextResponse.json(
      {
        ok: false,
        error: "setup_error",
        message,
      },
      { status: 500 },
    );
  }
}
