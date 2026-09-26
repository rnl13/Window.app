import type { ForecastMoment } from '@/lib/kite-rules';

export type ModelProviderForecast = {
  id: 'best_match' | 'ecmwf' | 'noaa';
  label: string;
  forecast: ForecastMoment[];
};

export type ModelForecastBySpot = Record<string, ModelProviderForecast[]>;

type ForecastResponse = {
  forecast: Record<string, ForecastMoment[]>;
  modelForecasts: ModelForecastBySpot;
  warnings: string[];
  generatedAt: string;
  source: string;
  error?: string;
};

export async function fetchForecasts() {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetch('/api/forecast', {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    const data = (await response.json()) as ForecastResponse;
    if (!response.ok) throw new Error(data.error ?? `Prognosen svarede ${response.status}.`);
    return data;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Prognosen tog for lang tid. Prøv igen om et øjeblik.');
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}
