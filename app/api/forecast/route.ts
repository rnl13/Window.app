import { type ForecastMoment, SPOTS } from '@/lib/kite-rules';

type OpenMeteoHourly = {
  time?: string[];
  wave_height?: Array<number | null>;
  wave_direction?: Array<number | null>;
  wave_period?: Array<number | null>;
  wind_speed_10m?: Array<number | null>;
  wind_direction_10m?: Array<number | null>;
};

type OpenMeteoResponse = {
  hourly?: OpenMeteoHourly;
};

type MetTimeseries = {
  time?: string;
  data?: { instant?: { details?: Record<string, unknown> } };
};

type MetResponse = {
  properties?: { timeseries?: MetTimeseries[] };
};

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function toIsoTime(time: string) {
  const date = new Date(time.endsWith('Z') ? time : `${time}:00Z`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

async function fetchJson(url: URL, userAgent?: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        ...(userAgent ? { 'User-Agent': userAgent } : {}),
      },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Prognosekilden svarede ${response.status}.`);
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchMetForecast(spot: (typeof SPOTS)[number]) {
  const query = new URLSearchParams({
    lat: String(Math.trunc(spot.coordinates.lat * 10000) / 10000),
    lon: String(Math.trunc(spot.coordinates.lon * 10000) / 10000),
  });
  const weatherUrl = new URL(`https://api.met.no/weatherapi/locationforecast/2.0/compact?${query}`);
  const oceanUrl = new URL(`https://api.met.no/weatherapi/oceanforecast/2.0/complete?${query}`);
  const userAgent = 'Window/1.0';
  const [weatherPayload, oceanPayload] = await Promise.all([
    fetchJson(weatherUrl, userAgent),
    fetchJson(oceanUrl, userAgent),
  ]);
  const weather = weatherPayload as MetResponse;
  const ocean = oceanPayload as MetResponse;
  const windByTime = new Map(
    (weather.properties?.timeseries ?? []).flatMap((moment) => {
      if (!moment.time) return [];
      const details = moment.data?.instant?.details ?? {};
      return [
        [
          moment.time,
          {
            windSpeed: asNumber(details.wind_speed),
            windDirection: asNumber(details.wind_from_direction),
          },
        ] as const,
      ];
    }),
  );

  const forecast = (ocean.properties?.timeseries ?? []).flatMap((moment): ForecastMoment[] => {
    if (!moment.time) return [];
    const wind = windByTime.get(moment.time);
    const details = moment.data?.instant?.details ?? {};
    if (!wind) return [];
    return [
      {
        time: moment.time,
        ...wind,
        waveHeight: asNumber(details.sea_surface_wave_height),
        wavePeriod: null,
        waveDirection: asNumber(details.sea_surface_wave_from_direction),
      },
    ];
  });
  if (forecast.length === 0) throw new Error(`${spot.name}: MET Norway leverede ingen læsbare data.`);
  return { spot, forecast };
}

function forecastResponse(
  usable: Array<{ spot: (typeof SPOTS)[number]; forecast: ForecastMoment[] }>,
  source: string,
  label: string,
  warnings: string[],
) {
  const forecast = Object.fromEntries(usable.map((result) => [result.spot.id, result.forecast]));
  const modelForecasts = Object.fromEntries(
    usable.map((result) => [
      result.spot.id,
      [{ id: 'best_match', label, forecast: result.forecast }],
    ]),
  );
  return Response.json(
    { generatedAt: new Date().toISOString(), modelRunAt: null,
      confidence: 'UNAVAILABLE', confidenceReason: 'Modelrun, ensemble og lokal præcision er endnu ikke verificeret.',
      forecast, modelForecasts, warnings, source },
    {
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=600, stale-while-revalidate=1800',
      },
    },
  );
}

function forecastFromResponses(marine: OpenMeteoResponse, wind: OpenMeteoResponse) {
  const marineHourly = marine.hourly ?? {};
  const windHourly = wind.hourly ?? {};
  const windByTime = new Map(
    (windHourly.time ?? []).map((time, index) => [
      time,
      {
        windSpeed: asNumber(windHourly.wind_speed_10m?.[index]),
        windDirection: asNumber(windHourly.wind_direction_10m?.[index]),
      },
    ]),
  );

  return (marineHourly.time ?? []).flatMap((time, index): ForecastMoment[] => {
    const windMoment = windByTime.get(time);
    const isoTime = toIsoTime(time);
    if (!windMoment || !isoTime) return [];
    return [
      {
        time: isoTime,
        ...windMoment,
        waveHeight: asNumber(marineHourly.wave_height?.[index]),
        wavePeriod: asNumber(marineHourly.wave_period?.[index]),
        waveDirection: asNumber(marineHourly.wave_direction?.[index]),
      },
    ];
  });
}

export async function GET() {
  const latitudes = SPOTS.map((spot) => spot.coordinates.lat).join(',');
  const longitudes = SPOTS.map((spot) => spot.coordinates.lon).join(',');

  const marineUrl = new URL('https://marine-api.open-meteo.com/v1/marine');
  marineUrl.search = new URLSearchParams({
    latitude: latitudes,
    longitude: longitudes,
    hourly: 'wave_height,wave_direction,wave_period',
    forecast_days: '5',
    timezone: 'GMT',
    cell_selection: 'sea',
  }).toString();

  const windUrl = new URL('https://api.open-meteo.com/v1/forecast');
  windUrl.search = new URLSearchParams({
    latitude: latitudes,
    longitude: longitudes,
    hourly: 'wind_speed_10m,wind_direction_10m',
    wind_speed_unit: 'ms',
    forecast_days: '5',
    timezone: 'GMT',
  }).toString();

  try {
    const [marinePayload, windPayload] = await Promise.all([fetchJson(marineUrl), fetchJson(windUrl)]);
    const marineResponses = (Array.isArray(marinePayload) ? marinePayload : [marinePayload]) as OpenMeteoResponse[];
    const windResponses = (Array.isArray(windPayload) ? windPayload : [windPayload]) as OpenMeteoResponse[];
    const forecasts = SPOTS.map((spot, index) => ({
      spot,
      forecast: forecastFromResponses(marineResponses[index] ?? {}, windResponses[index] ?? {}),
    }));
    const usable = forecasts.filter(({ forecast }) => forecast.length > 0);

    if (usable.length === 0) throw new Error('Prognosekilden leverede ingen læsbare data.');

    const missing = forecasts.filter(({ forecast }) => forecast.length === 0);
    return forecastResponse(
      usable,
      'Open-Meteo · bedste match',
      'Open-Meteo',
      missing.map(({ spot }) => `${spot.name}: prognosen mangler midlertidigt.`),
    );
  } catch (primaryError) {
    const metResults = await Promise.allSettled(SPOTS.map((spot) => fetchMetForecast(spot)));
    const usable = metResults.flatMap((result) =>
      result.status === 'fulfilled' ? [result.value] : [],
    );
    if (usable.length > 0) {
      const missing = metResults.flatMap((result, index) =>
        result.status === 'rejected' ? [`${SPOTS[index].name}: reserveprognosen mangler.`] : [],
      );
      return forecastResponse(
        usable,
        'MET Norway · reserveprognose',
        'MET Norway',
        [
          `Open-Meteo er midlertidigt utilgængelig: ${primaryError instanceof Error ? primaryError.message : 'ukendt fejl'}`,
          ...missing,
        ],
      );
    }
    return Response.json(
      { error: 'Både hoved- og reserveprognosen er midlertidigt utilgængelige.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
