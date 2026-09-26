'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bell,
  Camera,
  Check,
  CircleGauge,
  Clock3,
  Compass,
  ExternalLink,
  LockKeyhole,
  MapPin,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Waves,
  Wind,
} from 'lucide-react';

import HistoricalWind from '@/components/historical-wind';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { isDaylightAt } from '@/lib/daylight';
import {
  fetchForecasts,
  type ModelForecastBySpot,
  type ModelProviderForecast,
} from '@/lib/dmi-client';
import {
  compassLabel,
  type ForecastMoment,
  getSpot,
  scoreMoment,
  type ScoredMoment,
  SPOTS,
} from '@/lib/kite-rules';

type ForecastBySpot = Record<string, ForecastMoment[]>;
const FORECAST_CACHE_KEY = 'window-forecast-v1';
const THRESHOLD_KEY = 'window-threshold';
const NOTIFICATIONS_KEY = 'window-notifications';
const FAVORITES_KEY = 'window-favorites';
const WIND_UNIT_KEY = 'window-wind-unit';
const LEGACY_FORECAST_CACHE_KEY = 'kitekald-forecast-v3';
const LEGACY_THRESHOLD_KEY = 'kitekald-threshold';
const LEGACY_NOTIFICATIONS_KEY = 'kitekald-notifications';

const formatter = new Intl.DateTimeFormat('da-DK', {
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Copenhagen',
});

const shortFormatter = new Intl.DateTimeFormat('da-DK', {
  weekday: 'short',
  hour: '2-digit',
  timeZone: 'Europe/Copenhagen',
});

const dayFormatter = new Intl.DateTimeFormat('da-DK', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  timeZone: 'Europe/Copenhagen',
});

const dayKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: 'Europe/Copenhagen',
});

function formatTime(value: string) {
  return formatter.format(new Date(value)).replace('.', '');
}

function formatShortTime(value: string) {
  return shortFormatter.format(new Date(value)).replace('.', '');
}

function formatDay(value: string) {
  return dayFormatter.format(new Date(value)).replace('.', '');
}

function dayKey(value: string) {
  const parts = dayKeyFormatter.formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

function scoreLabel(score: number) {
  if (score >= 85) return 'Fremragende';
  if (score >= 70) return 'Meget lovende';
  if (score >= 55) return 'Muligt vindue';
  return 'Ikke klar endnu';
}

function scoreColor(score: number) {
  if (score >= 85) return 'bg-emerald-400 text-emerald-950';
  if (score >= 70) return 'bg-cyan-300 text-cyan-950';
  if (score >= 55) return 'bg-amber-300 text-amber-950';
  return 'bg-slate-700 text-slate-200';
}

function decimal(value: number | null, digits = 1) {
  return value === null ? '—' : value.toFixed(digits).replace('.', ',');
}

type WindUnit = 'ms' | 'kn';

function formatWind(value: number | null, unit: WindUnit) {
  if (value === null) return '—';
  return unit === 'kn'
    ? `${decimal(value * 1.94384)} kn`
    : `${decimal(value)} m/s`;
}

function Metric({
  icon: Icon,
  label,
  value,
  note,
}: {
  icon: typeof Wind;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.045] px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-cyan-100/55">
        <Icon className="size-3.5" />
        {label}
      </div>
      <div className="mt-1 flex items-baseline justify-between gap-2">
        <span className="text-base font-semibold tracking-tight text-white">
          {value}
        </span>
        <span className="text-[11px] text-cyan-100/50">{note}</span>
      </div>
    </div>
  );
}

function ScoreDisk({
  score,
  small = false,
}: {
  score: number;
  small?: boolean;
}) {
  return (
    <div
      className={`grid shrink-0 place-items-center rounded-full ${small ? 'size-12' : 'size-20'}`}
      style={{
        background: `conic-gradient(#67e8f9 ${score}%, rgba(255,255,255,.13) 0)`,
      }}
      aria-label={`Score ${score} ud af 100`}
    >
      <div
        className={`grid place-items-center rounded-full bg-[#063544] font-semibold text-white ${small ? 'size-10 text-xs' : 'size-[68px] text-xl'}`}
      >
        {score}
      </div>
    </div>
  );
}

type ModelDay = {
  date: string;
  label: string;
  providers: Array<{
    id: ModelProviderForecast['id'];
    label: string;
    score: number;
  }>;
  labelText: string;
  description: string;
  tone: string;
};

function modelDaysForSpot(
  providers: ModelProviderForecast[],
  spot: NonNullable<ReturnType<typeof getSpot>>,
  threshold: number,
) {
  const now = Date.now();
  const scored = providers.map((provider) => ({
    ...provider,
    moments: provider.forecast
      .filter((moment) => new Date(moment.time).getTime() >= now)
      .map((moment) => scoreMoment(spot, moment)),
  }));
  const dates = [
    ...new Set(
      scored.flatMap((provider) =>
        provider.moments.map((moment) => dayKey(moment.time)),
      ),
    ),
  ]
    .sort()
    .slice(0, 5);

  return dates.map((date): ModelDay => {
    const dayProviders = scored.flatMap((provider) => {
      const best = provider.moments
        .filter((moment) => dayKey(moment.time) === date)
        .reduce<ScoredMoment | null>(
          (current, moment) =>
            !current || moment.score > current.score ? moment : current,
          null,
        );
      return best
        ? [
            {
              id: provider.id,
              label: provider.label,
              score: best.score,
              time: best.time,
            },
          ]
        : [];
    });
    const scores = dayProviders.map((provider) => provider.score);
    const aboveThreshold = dayProviders.filter(
      (provider) => provider.score >= threshold,
    ).length;
    const spread =
      scores.length > 1 ? Math.max(...scores) - Math.min(...scores) : 100;
    const label = dayProviders[0]?.time
      ? formatDay(dayProviders[0].time)
      : date;

    if (dayProviders.length === 1) {
      const best = dayProviders[0];
      const promising = best.score >= threshold;
      return {
        date,
        label,
        providers: dayProviders,
        labelText: promising ? 'Lovende' : 'Under grænsen',
        description: promising
          ? `Dagens bedste tidspunkt scorer ${best.score}/100.`
          : `Bedste tidspunkt ligger på ${best.score}/100.`,
        tone: promising
          ? 'bg-cyan-300 text-cyan-950'
          : 'bg-slate-700 text-slate-100',
      };
    }
    if (dayProviders.length === 0) {
      return {
        date,
        label,
        providers: [],
        labelText: 'Afventer data',
        description: 'Dagens prognose er ikke klar endnu.',
        tone: 'bg-slate-700 text-slate-100',
      };
    }
    if (aboveThreshold === dayProviders.length && spread <= 12) {
      return {
        date,
        label,
        providers: dayProviders,
        labelText: 'Høj enighed',
        description: 'Alle viste modeller ser et kald over din grænse.',
        tone: 'bg-emerald-400 text-emerald-950',
      };
    }
    if (aboveThreshold >= 2 && spread <= 20) {
      return {
        date,
        label,
        providers: dayProviders,
        labelText: 'God enighed',
        description: 'Flere modeller ser et brugbart vindue.',
        tone: 'bg-cyan-300 text-cyan-950',
      };
    }
    if (aboveThreshold >= 2) {
      return {
        date,
        label,
        providers: dayProviders,
        labelText: 'Samme tendens',
        description: 'Flere ser et vindue, men styrken er uafklaret.',
        tone: 'bg-amber-300 text-amber-950',
      };
    }
    if (spread <= 12) {
      return {
        date,
        label,
        providers: dayProviders,
        labelText: 'Enige: under grænsen',
        description: 'Modellerne ser foreløbig ikke et klart kald.',
        tone: 'bg-slate-700 text-slate-100',
      };
    }
    return {
      date,
      label,
      providers: dayProviders,
      labelText: 'Uenige',
      description: 'Vent på næste opdatering, før du regner med vinduet.',
      tone: 'bg-rose-300 text-rose-950',
    };
  });
}

function WindowCard({
  spotId,
  moments,
  threshold,
  selected,
  favorite,
  windUnit,
  onSelect,
  onToggleFavorite,
}: {
  spotId: string;
  moments: ScoredMoment[];
  threshold: number;
  selected: boolean;
  favorite: boolean;
  windUnit: WindUnit;
  onSelect: () => void;
  onToggleFavorite: () => void;
}) {
  const spot = getSpot(spotId)!;
  const next =
    moments.find((moment) => moment.score >= threshold) ?? moments[0];

  if (!next) {
    return (
      <article
        className={`rounded-2xl border p-5 transition ${selected ? 'border-cyan-300 bg-cyan-100/10' : 'border-white/10 bg-white/[0.035] hover:bg-white/[0.07]'}`}
      >
        <div className="flex items-start justify-between gap-3">
          <button type="button" onClick={onSelect} className="text-left">
            <p className="font-semibold text-white">{spot.name}</p>
            <p className="mt-2 text-sm text-cyan-50/55">
              Afventer første læsbare prognose.
            </p>
          </button>
          <button
            type="button"
            onClick={onToggleFavorite}
            aria-label={`${favorite ? 'Fjern' : 'Tilføj'} ${spot.name} som favorit`}
            className={`rounded-lg p-2 transition ${favorite ? 'bg-cyan-300 text-[#063544]' : 'bg-white/[0.06] text-cyan-100/55 hover:text-cyan-100'}`}
          >
            <Star className={`size-4 ${favorite ? 'fill-current' : ''}`} />
          </button>
        </div>
      </article>
    );
  }

  const meetsThreshold = next.score >= threshold;
  return (
    <article
      className={`group rounded-2xl border p-5 transition ${selected ? 'border-cyan-300 bg-cyan-100/[0.12] shadow-[0_16px_35px_rgba(0,0,0,.16)]' : 'border-white/10 bg-white/[0.035] hover:-translate-y-0.5 hover:border-white/25 hover:bg-white/[0.07]'}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSelect}
              className="font-semibold text-white hover:text-cyan-100"
            >
              {spot.name}
            </button>
            <a
              href={spot.mapUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={`Åbn ${spot.name} i Google Maps`}
              onClick={(event) => event.stopPropagation()}
              className="text-cyan-200/70 hover:text-cyan-100"
            >
              <MapPin className="size-3.5" />
            </a>
          </div>
          <p className="mt-0.5 text-xs text-cyan-100/50">{spot.area}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleFavorite}
            aria-label={`${favorite ? 'Fjern' : 'Tilføj'} ${spot.name} som favorit`}
            className={`rounded-lg p-2 transition ${favorite ? 'bg-cyan-300 text-[#063544]' : 'bg-white/[0.06] text-cyan-100/55 hover:text-cyan-100'}`}
          >
            <Star className={`size-4 ${favorite ? 'fill-current' : ''}`} />
          </button>
          <button
            type="button"
            onClick={onSelect}
            aria-label={`Vis prognosen for ${spot.name}`}
          >
            <ScoreDisk score={next.score} small />
          </button>
        </div>
      </div>
      <button
        type="button"
        onClick={onSelect}
        className="mt-5 w-full text-left"
      >
        <div className="flex items-center justify-between gap-3">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${scoreColor(next.score)}`}
          >
            {scoreLabel(next.score)}
          </span>
          <span className="text-xs font-medium text-cyan-50/75">
            {meetsThreshold ? formatTime(next.time) : 'Ingen klar endnu'}
          </span>
        </div>
        <p className="mt-3 min-h-5 text-xs text-cyan-50/55">
          {formatWind(next.windSpeed, windUnit)} ·{' '}
          {next.reasons.length
            ? next.reasons.slice(0, 2).join(' · ')
            : 'Tætteste match i prognosen'}
        </p>
      </button>
    </article>
  );
}

export default function Home() {
  const [forecast, setForecast] = useState<ForecastBySpot>({});
  const [modelForecasts, setModelForecasts] = useState<ModelForecastBySpot>({});
  const [selectedSpot, setSelectedSpot] = useState('agger-tange');
  useEffect(()=>{const id=new URLSearchParams(window.location.search).get('spot');if(id&&getSpot(id))setSelectedSpot(id);},[]);
  const [threshold, setThreshold] = useState(72);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [forecastSource, setForecastSource] = useState('Open-Meteo · bedste match');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState<string | null>(
    null,
  );
  const [favorites, setFavorites] = useState<string[]>([]);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [windUnit, setWindUnit] = useState<WindUnit>('ms');
  const [preferencesReady, setPreferencesReady] = useState(false);

  const loadForecast = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchForecasts();
      setForecast(data.forecast);
      setModelForecasts(data.modelForecasts);
      setLastUpdated(data.generatedAt);
      setWarnings(data.warnings);
      setForecastSource(data.source);
      window.localStorage.setItem(FORECAST_CACHE_KEY, JSON.stringify(data));
    } catch (cause) {
      setForecast({});
      setModelForecasts({});
      setError(
        cause instanceof Error
          ? cause.message
          : 'Prognosen kunne ikke hentes lige nu.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  // Local preferences and cached forecasts can only be restored after the client mounts.
  // oxlint-disable react/react-compiler
  useEffect(() => {
    const storedThreshold =
      window.localStorage.getItem(THRESHOLD_KEY) ??
      window.localStorage.getItem(LEGACY_THRESHOLD_KEY);
    const storedNotifications =
      (window.localStorage.getItem(NOTIFICATIONS_KEY) ??
        window.localStorage.getItem(LEGACY_NOTIFICATIONS_KEY)) === 'true';
    const storedForecast =
      window.localStorage.getItem(FORECAST_CACHE_KEY) ??
      window.localStorage.getItem(LEGACY_FORECAST_CACHE_KEY);
    const storedFavorites = window.localStorage.getItem(FAVORITES_KEY);
    const storedWindUnit = window.localStorage.getItem(WIND_UNIT_KEY);
    if (storedThreshold) setThreshold(Number(storedThreshold));
    if (storedForecast) {
      try {
        const cached = JSON.parse(storedForecast) as {
          forecast?: ForecastBySpot;
          modelForecasts?: ModelForecastBySpot;
          generatedAt?: string;
          warnings?: string[];
          source?: string;
        };
        if (cached.generatedAt && Date.now() - Date.parse(cached.generatedAt) < 30 * 60 * 1000 && cached.forecast && Object.keys(cached.forecast).length > 0) {
          setForecast(cached.forecast);
          setModelForecasts(cached.modelForecasts ?? {});
          setLastUpdated(cached.generatedAt ?? null);
          setWarnings(cached.warnings ?? []);
          setForecastSource(cached.source ?? 'Senest hentede prognose');
        }
      } catch {
        window.localStorage.removeItem(FORECAST_CACHE_KEY);
      }
    }
    setNotificationsEnabled(
      storedNotifications &&
        'Notification' in window &&
        Notification.permission === 'granted',
    );
    if (storedFavorites) {
      try {
        setFavorites(JSON.parse(storedFavorites));
      } catch {
        window.localStorage.removeItem(FAVORITES_KEY);
      }
    }
    if (storedWindUnit === 'kn') setWindUnit('kn');
    setPreferencesReady(true);
    void loadForecast();
  }, [loadForecast]);
  // oxlint-enable react/react-compiler

  useEffect(() => {
    if (!preferencesReady) return;
    window.localStorage.setItem(THRESHOLD_KEY, String(threshold));
  }, [preferencesReady, threshold]);

  useEffect(() => {
    if (!preferencesReady) return;
    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }, [favorites, preferencesReady]);

  useEffect(() => {
    if (!preferencesReady) return;
    window.localStorage.setItem(WIND_UNIT_KEY, windUnit);
  }, [preferencesReady, windUnit]);

  useEffect(() => {
    if (!notificationsEnabled) return;
    const timer = window.setInterval(() => void loadForecast(), 20 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [loadForecast, notificationsEnabled]);

  const scoredForecast = useMemo(
    () =>
      Object.fromEntries(
        SPOTS.map((spot) => [
          spot.id,
          (forecast[spot.id] ?? []).map((moment) => scoreMoment(spot, moment)),
        ]),
      ) as Record<string, ScoredMoment[]>,
    [forecast],
  );

  useEffect(() => {
    if (!notificationsEnabled || loading || error || !lastUpdated || Date.now() - Date.parse(lastUpdated) > 30 * 60 * 1000 || !('Notification' in window)) return;
    for (const spot of SPOTS) {
      const next = (scoredForecast[spot.id] ?? []).find(
        (moment) =>
          moment.score >= threshold &&
          new Date(moment.time).getTime() > Date.now() &&
          new Date(moment.time).getTime() < Date.now() + 6 * 60 * 60 * 1000 &&
          isDaylightAt(moment.time, spot.coordinates.lat, spot.coordinates.lon),
      );
      if (!next) continue;
      const key = `window-notified:${spot.id}:${next.time}:${threshold}`;
      if (window.localStorage.getItem(key)) continue;
      try {
        new Notification(`${spot.name} ser lovende ud`, {
          body: `${scoreLabel(next.score)} (${next.score}/100) ${formatTime(next.time)}. ${next.reasons.slice(0, 2).join(' · ')}`,
        });
        window.localStorage.setItem(key, 'true');
      } catch {
        setNotificationsEnabled(false);
        window.localStorage.setItem(NOTIFICATIONS_KEY, 'false');
        setNotificationMessage('Browseren kunne ikke vise beskeden. Vindvagten er slået fra. På iPhone kræves en separat pushfunktion, som endnu ikke er aktiveret.');
        break;
      }
    }
  }, [notificationsEnabled, scoredForecast, threshold, loading, error, lastUpdated]);

  const enableNotifications = async (enabled: boolean) => {
    if (!enabled) {
      setNotificationsEnabled(false);
      window.localStorage.setItem(NOTIFICATIONS_KEY, 'false');
      return;
    }
    if (!('Notification' in window)) {
      setNotificationMessage('Din browser understøtter ikke notifikationer.');
      return;
    }
    let permission: NotificationPermission;
    try { permission = await Notification.requestPermission(); }
    catch { setNotificationMessage('Browseren kunne ikke bede om tilladelse. Prøv at åbne Window direkte i din browser.'); return; }
    if (permission !== 'granted') {
      setNotificationMessage(
        'Notifikationer er ikke tilladt i browseren endnu.',
      );
      return;
    }
    setNotificationsEnabled(true);
    setNotificationMessage('Notifikationer er slået til, mens siden er åben.');
    window.localStorage.setItem(NOTIFICATIONS_KEY, 'true');
  };

  const testNotification = () => {
    try {
      if (!('Notification' in window) || Notification.permission !== 'granted') {
        setNotificationMessage('Slå først vindvagten til og tillad notifikationer i browseren.');
        return;
      }
      new Notification('Window · Testbesked', {body: 'Dette er en test fra den åbne side. Det er ikke et vindvarsel.'});
      setNotificationMessage('Testbeskeden er givet til browseren. Så du den? Hvis ikke, kontrollér enhedens notifikationer og Fokus. Testen viser ikke, om beskeder virker med appen lukket.');
    } catch {
      setNotificationsEnabled(false);
      window.localStorage.setItem(NOTIFICATIONS_KEY, 'false');
      setNotificationMessage('Denne browser kan ikke vise den nuværende type besked. På iPhone kræves en separat pushfunktion, som endnu ikke er aktiveret.');
    }
  };

  const currentSpot = getSpot(selectedSpot)!;
  const visibleSpots = favoritesOnly
    ? SPOTS.filter((spot) => favorites.includes(spot.id))
    : SPOTS;
  const timeline = (scoredForecast[selectedSpot] ?? []).slice(0, 24);
  const nextWindow =
    timeline.find((moment) => moment.score >= threshold) ?? timeline[0];
  const hasForecast = Object.values(forecast).some(
    (moments) => moments.length > 0,
  );
  const modelDays = useMemo(
    () =>
      modelDaysForSpot(
        modelForecasts[selectedSpot] ?? [],
        currentSpot,
        threshold,
      ),
    [currentSpot, modelForecasts, selectedSpot, threshold],
  );
  const topWind = currentSpot.windTargets[0].label;
  const topWave = currentSpot.waveTargets[0].label;
  const highScoreWindLower = Math.max(8, currentSpot.windHint.ideal - 1);
  const highScoreWindUpper = currentSpot.windHint.ideal + 4;
  const windForHighScore =
    windUnit === 'kn'
      ? `${decimal(highScoreWindLower * 1.94384, 0)}–${decimal(highScoreWindUpper * 1.94384, 0)} kn`
      : `${highScoreWindLower}–${highScoreWindUpper} m/s`;
  const idealConditionText = currentSpot.cleanWave
    ? `${currentSpot.name} er bedst med ${topWave}-bølger og ${topWind}-vind, hvor ${currentSpot.cleanWave.note}.`
    : `${currentSpot.name} er bedst med ${topWave}-bølger og ${topWind}-vind.`;
  const highScoreText = `En høj score (85+) kræver, at retningerne ligger tæt på idealet, vind omkring ${windForHighScore}, bølger på mindst ca. ${decimal(currentSpot.minWaveHint)} m og en periode på mindst ${currentSpot.periodHint} sekunder.`;

  const toggleFavorite = (spotId: string) => {
    if (favoritesOnly && favorites.length === 1 && favorites[0] === spotId)
      setFavoritesOnly(false);
    setFavorites((current) =>
      current.includes(spotId)
        ? current.filter((id) => id !== spotId)
        : [...current, spotId],
    );
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#042934] text-white">
      <div className="pointer-events-none fixed inset-0 ocean-drift opacity-70" />
      <div className="relative mx-auto max-w-7xl px-5 pb-14 pt-6 sm:px-8 lg:px-10">
        <header className="flex flex-col justify-between gap-5 border-b border-white/10 pb-6 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-2xl bg-cyan-300 text-[#063544] shadow-[0_10px_30px_rgba(103,232,249,.22)]">
              <Waves className="size-6" />
            </div>
            <div>
              <p className="text-lg font-semibold tracking-tight text-white">
                Window
              </p>
              <p className="text-xs text-cyan-100/55">
                Vind, bølger og dine muligheder
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-2 text-xs text-cyan-50/60">
              <span
                className={`size-2 rounded-full ${loading ? 'animate-pulse bg-amber-300' : error ? 'bg-rose-300' : 'bg-emerald-300'}`}
              />
              {loading
                ? 'Opdaterer prognose'
                : error
                  ? 'Seneste prognose vises'
                  : forecastSource}
            </span>
            <div
              className="flex rounded-lg border border-white/15 bg-white/[0.05] p-0.5"
              aria-label="Vindenhed"
            >
              <button
                type="button"
                onClick={() => setWindUnit('ms')}
                className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${windUnit === 'ms' ? 'bg-cyan-300 text-[#063544]' : 'text-cyan-50/60 hover:text-white'}`}
              >
                m/s
              </button>
              <button
                type="button"
                onClick={() => setWindUnit('kn')}
                className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${windUnit === 'kn' ? 'bg-cyan-300 text-[#063544]' : 'text-cyan-50/60 hover:text-white'}`}
              >
                knob
              </button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadForecast()}
              disabled={loading}
              className="border-white/15 bg-white/[0.06] text-white hover:bg-white/[0.12] hover:text-white"
            >
              <RefreshCw
                className={`size-3.5 ${loading ? 'animate-spin' : ''}`}
              />
              Opdater
            </Button>
          </div>
        </header>
        <a href="/ride" className="mt-5 flex min-h-14 items-center justify-between rounded-xl bg-cyan-200 px-5 py-4 text-base font-semibold text-[#052a38]">What should I ride? <span>Sport · spot · tid →</span></a>

        <aside className="mt-5 rounded-xl border border-amber-200/30 bg-amber-200/10 p-4 text-base text-amber-100">
          Forecast Confidence: ikke vurderet. Scoren er et foreløbigt vejrmatch; lokale regler og turens gennemførlighed er ikke verificeret.
          <a className="ml-2 underline" href="/decision-lab">Prøv den nye turbeslutning med demodata</a>
        </aside>
        <section className="grid gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_325px]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200/65">
              My Window
            </p>
            <div className="mt-3 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="max-w-2xl text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
                  Find det næste window, der faktisk er værd at køre efter.
                </h1>
                <p className="mt-4 max-w-xl text-sm leading-6 text-cyan-50/65 sm:text-base">
                  En høj Window Score kræver, at vindstyrke, vindretning og bølger passer godt til spottet. Bølgehøjde, bølgeretning og periode tæller også med. De bedste forhold varierer fra spot til spot – scoren viser vejrmatchet, ikke hvor sikker prognosen er.
                </p>
              </div>
              {nextWindow && (
                <div className="flex min-w-44 items-center gap-3 rounded-2xl border border-cyan-200/20 bg-cyan-200/[0.07] p-3">
                  <ScoreDisk score={nextWindow.score} small />
                  <div>
                    <p className="text-xs text-cyan-100/60">
                      Næste for {currentSpot.name}
                    </p>
                    <p className="mt-0.5 font-semibold text-white">
                      {formatTime(nextWindow.time)}
                    </p>
                    <p className="text-xs text-cyan-100/60">
                      {scoreLabel(nextWindow.score)}
                    </p>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-8 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-white">
                Spots{' '}
                <span className="ml-1 text-xs font-normal text-cyan-50/50">
                  {favorites.length
                    ? `${favorites.length} favorit${favorites.length === 1 ? '' : 'ter'}`
                    : 'Tryk på stjernen for at gemme'}
                </span>
              </p>
              <button
                type="button"
                onClick={() => setFavoritesOnly((current) => !current)}
                disabled={favorites.length === 0}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${favoritesOnly ? 'border-cyan-300 bg-cyan-300 text-[#063544]' : 'border-white/15 bg-white/[0.05] text-cyan-50/70 hover:text-white'}`}
              >
                <Star
                  className={`size-3.5 ${favoritesOnly ? 'fill-current' : ''}`}
                />
                Kun favoritter
              </button>
            </div>
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              {visibleSpots.map((spot) => (
                <WindowCard
                  key={spot.id}
                  spotId={spot.id}
                  moments={scoredForecast[spot.id] ?? []}
                  threshold={threshold}
                  selected={spot.id === selectedSpot}
                  favorite={favorites.includes(spot.id)}
                  windUnit={windUnit}
                  onSelect={() => setSelectedSpot(spot.id)}
                  onToggleFavorite={() => toggleFavorite(spot.id)}
                />
              ))}
            </div>
          </div>

          <Card className="h-fit border border-white/10 bg-[#073b49]/90 text-white shadow-[0_20px_50px_rgba(0,0,0,.18)]">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="grid size-9 place-items-center rounded-xl bg-cyan-200/15 text-cyan-200">
                  <Bell className="size-4" />
                </div>
                <Switch
                  aria-label="Vindvagt mens siden er åben"
                  checked={notificationsEnabled}
                  onCheckedChange={enableNotifications}
                />
              </div>
              <CardTitle className="pt-2 text-white">
                Vindvagt på den åbne side
              </CardTitle>
              <CardDescription className="leading-5 text-cyan-50/60">
                Vælg din minimumsscore. Denne vindvagt kræver, at siden er åben og aktiv. Den overvåger ikke vejret, når appen er lukket.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl bg-black/15 px-3 py-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-cyan-50/70">Din minimumsscore</span>
                  <span className="font-semibold text-cyan-200">
                    {threshold}/100
                  </span>
                </div>
                <input
                  aria-label="Minimumsscore for notifikation"
                  className="mt-3 w-full accent-cyan-300"
                  type="range"
                  min="55"
                  max="90"
                  step="1"
                  value={threshold}
                  onChange={(event) => setThreshold(Number(event.target.value))}
                />
                <div className="mt-1 flex justify-between text-[11px] text-cyan-50/40">
                  <span>Flere bud</span>
                  <span>Kun topforhold</span>
                </div>
              </div>
              <p className="mt-4 text-xs leading-5 text-cyan-50/55">
                {notificationsEnabled
                  ? 'Vagten tjekker igen hvert 20. minut, mens denne fane er åben. Den sender kun kald, når solen er over horisonten ved spottet.'
                  : 'Slå vagten til for at bede browseren om tilladelse. Kald sendes kun i dagslys ved spottet.'}
              </p>
              <Button type="button" variant="outline" className="mt-4 border-white/20 bg-transparent text-white" onClick={testNotification}>
                Test browserbesked
              </Button>
              <p className="mt-3 text-sm leading-5 text-cyan-50/65"><a href="/push" className="underline">Opsæt pushbeskeder på telefonen</a> · <a href="/calendar" className="underline">Kalenderpåmindelser</a></p>
              {notificationMessage && (
                <p role="status" className="mt-2 text-sm text-cyan-100">
                  {notificationMessage}
                </p>
              )}
            </CardContent>
          </Card>
        </section>

        {error && !hasForecast ? (
          <section className="rounded-2xl border border-amber-200/25 bg-amber-100/[0.09] px-5 py-4 text-sm text-amber-50">
            <div className="flex items-start gap-3">
              <Clock3 className="mt-0.5 size-4 shrink-0 text-amber-200" />
              <div>
                <p className="font-semibold">
                  Prognosen kunne ikke hentes lige nu
                </p>
                <p className="mt-1 text-amber-50/75">
                  {error} Window viser den senest gemte prognose, når den er
                  tilgængelig.
                </p>
              </div>
            </div>
          </section>
        ) : (
          <section className="rounded-3xl border border-white/10 bg-[#063542]/80 p-5 shadow-[0_20px_50px_rgba(0,0,0,.12)] sm:p-7">
            <div className="flex flex-col gap-4 border-b border-white/10 pb-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-cyan-200">
                  <MapPin className="size-4" />
                  <span className="text-xs font-semibold uppercase tracking-[0.14em]">
                    Udvalgt spot
                  </span>
                </div>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
                  {currentSpot.name}
                </h2>
                <p className="mt-1 text-sm text-cyan-50/60">
                  {currentSpot.note}
                </p>
              </div>
              <Badge
                className="border-0 bg-white/[0.09] px-3 py-1 text-cyan-100"
                variant="outline"
              >
                <ShieldCheck className="size-3.5" />
                Blød matchscore
              </Badge>
            </div>
            <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_270px]">
              <div>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      Næste 24 timer
                    </p>
                    <p className="mt-1 text-xs text-cyan-50/55">
                      Score sammenligner forholdene med dine spotregler — ikke
                      med en anonym “surfrating”.
                    </p>
                  </div>
                  {lastUpdated && (
                    <p className="hidden text-right text-xs text-cyan-50/45 sm:block">
                      Opdateret {formatTime(lastUpdated)}
                    </p>
                  )}
                </div>
                {loading && timeline.length === 0 ? (
                  <div className="mt-5 grid grid-cols-4 gap-2 sm:grid-cols-6">
                    {Array.from({ length: 12 }).map((_, index) => (
                      <div
                        key={index}
                        className="h-28 animate-pulse rounded-xl bg-white/[0.07]"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="mt-5 overflow-x-auto pb-2">
                    <div className="grid min-w-[760px] grid-cols-12 gap-2">
                      {timeline.slice(0, 12).map((moment) => (
                        <div
                          key={moment.time}
                          className="rounded-xl border border-white/[0.08] bg-black/[0.11] px-2.5 py-3"
                        >
                          <p className="text-[11px] font-medium text-cyan-50/55">
                            {formatShortTime(moment.time)}
                          </p>
                          <p className="mt-2 text-xl font-semibold tracking-tight text-white">
                            {moment.score}
                          </p>
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full bg-cyan-300"
                              style={{ width: `${moment.score}%` }}
                            />
                          </div>
                          <p className="mt-3 text-xs text-cyan-50/65">
                            {formatWind(moment.windSpeed, windUnit)}
                          </p>
                          <p className="mt-1 text-xs text-cyan-50/45">
                            {decimal(moment.waveHeight)} m ·{' '}
                            {decimal(moment.wavePeriod, 0)} s
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/[0.12] p-4">
                <div className="flex items-center gap-2 text-cyan-200">
                  <CircleGauge className="size-4" />
                  <p className="text-xs font-semibold uppercase tracking-[0.14em]">
                    Læs scoren
                  </p>
                </div>
                <div className="mt-4 space-y-3 text-xs leading-5 text-cyan-50/65">
                  <p>
                    <span className="font-semibold text-white">24%</span>{' '}
                    vindretning ·{' '}
                    <span className="font-semibold text-white">22%</span>{' '}
                    vindstyrke
                  </p>
                  <p>
                    <span className="font-semibold text-white">20%</span>{' '}
                    bølgeretning ·{' '}
                    <span className="font-semibold text-white">22%</span>{' '}
                    periode
                  </p>
                  <p>
                    <span className="font-semibold text-white">12%</span>{' '}
                    bølgehøjde{' '}
                    {currentSpot.cleanWave
                      ? `· plus bonus for ren ${currentSpot.cleanWave.label}-vind`
                      : ''}
                  </p>
                  <p className="border-t border-white/10 pt-3">
                    {idealConditionText} {highScoreText} Retningerne falder gradvist i værdi uden for
                    idealet, så “næsten rigtigt” stadig kan være et godt vindue.
                  </p>
                </div>
              </div>
            </div>
            {nextWindow && (
              <div className="mt-6 grid gap-3 md:grid-cols-5">
                <Metric
                  icon={Wind}
                  label="Vind"
                  value={formatWind(nextWindow.windSpeed, windUnit)}
                  note={compassLabel(nextWindow.windDirection)}
                />
                <Metric
                  icon={Compass}
                  label="Vind fra"
                  value={`${compassLabel(nextWindow.windDirection)} ${decimal(nextWindow.windDirection, 0)}°`}
                  note="retning"
                />
                <Metric
                  icon={Waves}
                  label="Bølge"
                  value={`${decimal(nextWindow.waveHeight)} m`}
                  note={`${decimal(nextWindow.wavePeriod, 0)} sek.`}
                />
                <Metric
                  icon={Compass}
                  label="Bølger fra"
                  value={`${compassLabel(nextWindow.waveDirection)} ${decimal(nextWindow.waveDirection, 0)}°`}
                  note="retning"
                />
                <Metric
                  icon={Check}
                  label="Match"
                  value={`${nextWindow.score}/100`}
                  note={scoreLabel(nextWindow.score)}
                />
              </div>
            )}
            <div className="mt-6 border-t border-white/10 pt-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-cyan-200">
                    <CircleGauge className="size-4" />
                    <p className="text-xs font-semibold uppercase tracking-[0.14em]">
                      5-dages overblik
                    </p>
                  </div>
                  <p className="mt-2 max-w-2xl text-xs leading-5 text-cyan-50/60">
                    Open-Meteo samler den bedst tilgængelige vind- og
                    bølgeprognose fem dage frem og vurderer hver dag efter de
                    samme spotregler.
                  </p>
                </div>
                <Badge
                  className="w-fit border-0 bg-white/[0.09] px-3 py-1 text-cyan-100"
                  variant="outline"
                >
                  Samme spotregler
                </Badge>
              </div>
              {modelDays.length > 0 ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                  {modelDays.map((day) => (
                    <div
                      key={day.date}
                      className="rounded-xl border border-white/10 bg-black/[0.1] p-3.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold capitalize text-white">
                          {day.label}
                        </p>
                        <span
                          className={`rounded-full px-2 py-1 text-[10px] font-semibold ${day.tone}`}
                        >
                          {day.labelText}
                        </span>
                      </div>
                      <div className="mt-3 space-y-1.5">
                        {day.providers.map((provider) => (
                          <div
                            key={provider.id}
                            className="flex items-center justify-between gap-3 text-xs"
                          >
                            <span className="text-cyan-50/60">
                              {provider.label}
                            </span>
                            <span
                              className={`font-semibold ${provider.score >= threshold ? 'text-cyan-200' : 'text-cyan-50/55'}`}
                            >
                              {provider.score}/100
                            </span>
                          </div>
                        ))}
                      </div>
                      <p className="mt-3 border-t border-white/10 pt-3 text-[11px] leading-4 text-cyan-50/55">
                        {day.description}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-white/10 bg-black/[0.1] px-4 py-3 text-sm text-cyan-50/60">
                  Femdages-modellerne hentes sammen med næste opdatering.
                </div>
              )}
            </div>
            <div className="mt-6 border-t border-white/10 pt-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-cyan-200">
                  <Camera className="size-4" />
                  <p className="text-xs font-semibold uppercase tracking-[0.14em]">
                    Nærmeste webcams
                  </p>
                </div>
                <p className="text-xs text-cyan-50/45">
                  Åbner direkte hos udbyderen
                </p>
              </div>
              {currentSpot.webcams.length > 0 ? (
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {currentSpot.webcams.map((webcam) => (
                    <a
                      key={webcam.url}
                      href={webcam.url}
                      target="_blank"
                      rel="noreferrer"
                      className="group flex items-start justify-between gap-4 rounded-xl border border-white/10 bg-black/[0.1] p-3.5 transition hover:border-cyan-200/45 hover:bg-white/[0.06]"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-white">
                            {webcam.title}
                          </p>
                          {webcam.requiresAccess && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-200/15 px-2 py-0.5 text-[10px] font-semibold text-amber-100">
                              <LockKeyhole className="size-2.5" />
                              Kræver adgang
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-cyan-100/55">
                          {webcam.location}
                        </p>
                        <p className="mt-2 text-xs leading-5 text-cyan-50/60">
                          {webcam.note}
                        </p>
                      </div>
                      <ExternalLink className="mt-0.5 size-4 shrink-0 text-cyan-200/70 transition group-hover:text-cyan-100" />
                    </a>
                  ))}
                </div>
              ) : (
                <p className="mt-3 rounded-xl border border-white/10 bg-black/[0.1] px-3.5 py-3 text-xs leading-5 text-cyan-50/60">
                  Ingen webcam-kilde er tilføjet her endnu — hellere ingen end
                  en upålidelig visning.
                </p>
              )}
            </div>
          </section>
        )}

        <HistoricalWind spotId={selectedSpot} spotName={currentSpot.name} unit={windUnit} />

        {error && hasForecast && (
          <section className="mt-7 rounded-2xl border border-amber-200/25 bg-amber-100/[0.09] px-5 py-3 text-sm text-amber-50">
            En prognosekilde svarer ikke lige nu. Du ser den senest hentede
            prognose.
          </section>
        )}
        <section className="mt-7 grid gap-4 lg:grid-cols-[1.1fr_.9fr]">
          <Card className="border border-white/10 bg-white/[0.035] text-white">
            <CardHeader>
              <div className="flex items-center gap-2 text-cyan-200">
                <SlidersHorizontal className="size-4" />
                <span className="text-xs font-semibold uppercase tracking-[0.14em]">
                  Spotregler i denne version
                </span>
              </div>
              <CardTitle className="pt-2 text-white">
                Det er dine regler, som styrer kaldet
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {SPOTS.map((spot) => (
                <div
                  key={spot.id}
                  className="rounded-xl border border-white/10 bg-black/[0.1] p-3.5"
                >
                  <p className="font-semibold text-white">{spot.name}</p>
                  <p className="mt-1 text-xs leading-5 text-cyan-50/60">
                    Vind:{' '}
                    {spot.windTargets.map((target) => target.label).join(' / ')}{' '}
                    · Bølger:{' '}
                    {spot.waveTargets.map((target) => target.label).join(' / ')}{' '}
                    · Periode fra ca. {spot.periodHint} sek.
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="border border-white/10 bg-white/[0.035] text-white">
            <CardHeader>
              <div className="flex items-center gap-2 text-cyan-200">
                <Bell className="size-4" />
                <span className="text-xs font-semibold uppercase tracking-[0.14em]">
                  Om notifikationer
                </span>
              </div>
              <CardTitle className="pt-2 text-white">
                Klar til næste trin
              </CardTitle>
              <CardDescription className="leading-5 text-cyan-50/60">
                Denne første version giver browserkald, mens siden er åben.
                Rigtige baggrundskald, når mobilen eller computeren er lukket,
                kræver en lille serverplan og push-opsætning.
              </CardDescription>
            </CardHeader>
          </Card>
        </section>
        {warnings.length > 0 && (
          <p className="mt-5 text-xs text-amber-100/70">
            Delvis prognose: {warnings.join(' ')}
          </p>
        )}
      </div>
    </main>
  );
}
