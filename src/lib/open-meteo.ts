import { buildJstIso } from "@/lib/time";
import type { SlotAggregate, SpotSeed } from "@/lib/types";

interface HourlyData {
  time: string[];
  wave_height?: number[];
  wave_period?: number[];
  wind_speed_10m?: number[];
  wind_direction_10m?: number[];
}

interface OpenMeteoResponse {
  hourly?: HourlyData;
}

interface MergedHour {
  time: string;
  hour: number;
  waveHeightM: number;
  wavePeriodS: number;
  windSpeedMs: number;
  windDirectionDeg: number;
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  const total = values.reduce((sum, value) => sum + value, 0);
  return total / values.length;
}

function averageDirection(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  const vectors = values.map((deg) => {
    const rad = (deg * Math.PI) / 180;
    return { x: Math.cos(rad), y: Math.sin(rad) };
  });

  const x = average(vectors.map((vector) => vector.x));
  const y = average(vectors.map((vector) => vector.y));

  let deg = (Math.atan2(y, x) * 180) / Math.PI;
  if (deg < 0) {
    deg += 360;
  }
  return deg;
}

function parseHour(localIsoLike: string): number {
  return Number(localIsoLike.slice(11, 13));
}

function ensureHourly(response: OpenMeteoResponse, sourceName: string): HourlyData {
  if (!response.hourly || !response.hourly.time) {
    throw new Error(`${sourceName} の hourly データが不足しています`);
  }

  return response.hourly;
}

function buildForecastUrl(spot: SpotSeed, dateJst: string): string {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(spot.latitude));
  url.searchParams.set("longitude", String(spot.longitude));
  url.searchParams.set("hourly", "wind_speed_10m,wind_direction_10m");
  url.searchParams.set("timezone", "Asia/Tokyo");
  url.searchParams.set("start_date", dateJst);
  url.searchParams.set("end_date", dateJst);
  return url.toString();
}

function buildMarineUrl(spot: SpotSeed, dateJst: string): string {
  const url = new URL("https://marine-api.open-meteo.com/v1/marine");
  url.searchParams.set("latitude", String(spot.latitude));
  url.searchParams.set("longitude", String(spot.longitude));
  url.searchParams.set("hourly", "wave_height,wave_period");
  url.searchParams.set("timezone", "Asia/Tokyo");
  url.searchParams.set("start_date", dateJst);
  url.searchParams.set("end_date", dateJst);
  return url.toString();
}

function mergeHourly(weather: HourlyData, marine: HourlyData): MergedHour[] {
  const marineByTime = new Map<string, { waveHeightM: number; wavePeriodS: number }>();

  marine.time.forEach((time, index) => {
    const waveHeightM = marine.wave_height?.[index];
    const wavePeriodS = marine.wave_period?.[index];

    if (waveHeightM == null || wavePeriodS == null) {
      return;
    }

    marineByTime.set(time, { waveHeightM, wavePeriodS });
  });

  const merged: MergedHour[] = [];

  weather.time.forEach((time, index) => {
    const joinedMarine = marineByTime.get(time);
    const windSpeedMs = weather.wind_speed_10m?.[index];
    const windDirectionDeg = weather.wind_direction_10m?.[index];

    if (!joinedMarine || windSpeedMs == null || windDirectionDeg == null) {
      return;
    }

    const hour = parseHour(time);
    if (hour < 6 || hour >= 18) {
      return;
    }

    merged.push({
      time,
      hour,
      waveHeightM: joinedMarine.waveHeightM,
      wavePeriodS: joinedMarine.wavePeriodS,
      windSpeedMs,
      windDirectionDeg,
    });
  });

  return merged;
}

export async function fetchSpotSlots(spot: SpotSeed, dateJst: string): Promise<SlotAggregate[]> {
  const [weatherResponse, marineResponse] = await Promise.all([
    fetch(buildForecastUrl(spot, dateJst), { cache: "no-store" }),
    fetch(buildMarineUrl(spot, dateJst), { cache: "no-store" }),
  ]);

  if (!weatherResponse.ok) {
    throw new Error(`気象API取得に失敗しました (${weatherResponse.status})`);
  }

  if (!marineResponse.ok) {
    throw new Error(`海況API取得に失敗しました (${marineResponse.status})`);
  }

  const weatherData = (await weatherResponse.json()) as OpenMeteoResponse;
  const marineData = (await marineResponse.json()) as OpenMeteoResponse;

  const weather = ensureHourly(weatherData, "気象API");
  const marine = ensureHourly(marineData, "海況API");
  const mergedHours = mergeHourly(weather, marine);

  const slots = [0, 1, 2, 3]
    .map((slotIndex) => {
      const startHour = 6 + slotIndex * 3;
      const endHour = startHour + 3;
      const points = mergedHours.filter((hourly) => hourly.hour >= startHour && hourly.hour < endHour);

      if (points.length === 0) {
        return null;
      }

      return {
        spotId: spot.id,
        forecastDate: dateJst,
        slotStartIso: buildJstIso(dateJst, startHour),
        slotEndIso: buildJstIso(dateJst, endHour),
        waveHeightM: Number(average(points.map((point) => point.waveHeightM)).toFixed(2)),
        wavePeriodS: Number(average(points.map((point) => point.wavePeriodS)).toFixed(2)),
        windSpeedMs: Number(average(points.map((point) => point.windSpeedMs)).toFixed(2)),
        windDirectionDeg: Number(
          averageDirection(points.map((point) => point.windDirectionDeg)).toFixed(1),
        ),
      } satisfies SlotAggregate;
    })
    .filter((slot): slot is SlotAggregate => slot !== null);

  return slots;
}
