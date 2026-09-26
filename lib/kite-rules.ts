export type DirectionTarget = {
  bearing: number;
  width: number;
  peak: number;
  label: string;
};

export type WebcamLink = {
  title: string;
  location: string;
  note: string;
  url: string;
  requiresAccess?: boolean;
};

export type SpotRule = {
  id: string;
  name: string;
  area: string;
  coordinates: { lat: number; lon: number };
  mapUrl: string;
  windTargets: DirectionTarget[];
  waveTargets: DirectionTarget[];
  periodHint: number;
  minWaveHint: number;
  windHint: { lower: number; ideal: number; upper: number };
  cleanWave?: { bearing: number; width: number; bonus: number; label: string; note: string };
  note: string;
  webcams: WebcamLink[];
};

// Bearings are the direction the wind or waves come FROM. The rules are deliberately
// soft: every input contributes to a score rather than becoming an all-or-nothing filter.
export const SPOTS: SpotRule[] = [
  {
    id: 'agger-tange',
    name: 'Agger Tange',
    area: 'Thy · Vestkysten',
    coordinates: { lat: 56.72373, lon: 8.221604 },
    mapUrl: 'https://maps.google.com/?q=56.723730,8.221604',
    windTargets: [
      { bearing: 135, width: 42, peak: 100, label: 'SØ' },
      { bearing: 180, width: 48, peak: 88, label: 'S' },
    ],
    waveTargets: [
      { bearing: 180, width: 44, peak: 100, label: 'S' },
      { bearing: 225, width: 48, peak: 90, label: 'SV' },
    ],
    periodHint: 6,
    minWaveHint: 0.65,
    windHint: { lower: 6, ideal: 11, upper: 18 },
    note: 'S-bølger og SØ-vind er top. SV-bølger og S-vind tæller positivt som et nært alternativ.',
    webcams: [
      {
        title: 'Windfinder · Thyborøn',
        location: 'Områdets webcamoversigt',
        note: 'Find de aktive kameraer og seneste opdateringer i området.',
        url: 'https://www.windfinder.com/webcams/thyboron',
      },
    ],
  },
  {
    id: 'hanstholm',
    name: 'Hanstholm',
    area: 'Thy · Nordvestkysten',
    coordinates: { lat: 57.12057, lon: 8.6032 },
    mapUrl: 'https://maps.google.com/?q=57.120570,8.603200',
    windTargets: [
      { bearing: 247.5, width: 34, peak: 100, label: 'VSV' },
      { bearing: 270, width: 48, peak: 84, label: 'V' },
    ],
    waveTargets: [
      { bearing: 270, width: 70, peak: 100, label: 'V' },
      { bearing: 247.5, width: 58, peak: 92, label: 'VSV' },
    ],
    periodHint: 6,
    minWaveHint: 0.6,
    windHint: { lower: 6, ideal: 11, upper: 18 },
    cleanWave: { bearing: 247.5, width: 28, bonus: 14, label: 'VSV', note: 'den let fralandske VSV-vind hjælper med at rense bølgerne' },
    note: 'VSV-vind er sat som topforhold: en let fralandskomponent kan rense bølgerne. V-vind med V-bølger er stadig et godt match.',
    webcams: [
      {
        title: 'Surf Pro · Hanstholm wavecam',
        location: 'Hanstholm',
        note: 'Lokal wavecam fra Cold Hawaii.',
        url: 'https://surfpro-coldhawaii.dk/pages/webcam',
        requiresAccess: true,
      },
      {
        title: 'Windfinder · Hanstholm',
        location: 'Webcamoversigt nær spottene',
        note: 'Se tilgængelige kameraer og aktuelle lokale observationer.',
        url: 'https://www.windfinder.com/webcams/hanstholm',
      },
    ],
  },
  {
    id: 'mon-fyr',
    name: 'Møn Fyr',
    area: 'Møn · Møns Klint',
    coordinates: { lat: 54.956085, lon: 12.552391 },
    mapUrl: 'https://maps.google.com/?q=54.956085,12.552391',
    windTargets: [
      { bearing: 90, width: 24, peak: 100, label: 'Ø' },
      { bearing: 67.5, width: 34, peak: 88, label: 'ØNØ' },
      { bearing: 112.5, width: 34, peak: 88, label: 'ØSØ' },
    ],
    waveTargets: [
      { bearing: 90, width: 34, peak: 100, label: 'Ø' },
      { bearing: 67.5, width: 44, peak: 86, label: 'ØNØ' },
      { bearing: 112.5, width: 44, peak: 86, label: 'ØSØ' },
    ],
    periodHint: 5.5,
    minWaveHint: 0.65,
    windHint: { lower: 8, ideal: 12, upper: 20 },
    note: 'Ren Ø-vind er top: stærk, stabil østvind bygger ordnede bølger over revene. Spotten er eksponeret med sten og mærkbar strøm, så den kræver lokal vurdering.',
    webcams: [],
  },
  {
    id: 'norre-vorupor',
    name: 'Nørre Vorupør',
    area: 'Thy · Cold Hawaii',
    coordinates: { lat: 56.960684, lon: 8.369138 },
    mapUrl: 'https://maps.google.com/?q=56.960684,8.369138',
    windTargets: [
      { bearing: 45, width: 30, peak: 100, label: 'NØ' },
      { bearing: 225, width: 40, peak: 94, label: 'SV' },
      { bearing: 247.5, width: 48, peak: 86, label: 'VSV' },
    ],
    waveTargets: [
      { bearing: 247.5, width: 52, peak: 100, label: 'VSV' },
      { bearing: 270, width: 52, peak: 94, label: 'V' },
      { bearing: 225, width: 46, peak: 90, label: 'SV' },
    ],
    periodHint: 6,
    minWaveHint: 0.8,
    windHint: { lower: 8, ideal: 13, upper: 21 },
    cleanWave: { bearing: 45, width: 24, bonus: 12, label: 'NØ', note: 'NØ-vind hjælper med at holde linjerne rene ved molen' },
    note: 'NØ giver de rene linjer ved molen. Stærk SV–V bygger større North Sea-bølger, men spotten har moler, fiskerbåde, shorebreak og strøm — kun med lokal vurdering.',
    webcams: [],
  },
];

export type ForecastMoment = {
  time: string;
  windSpeed: number | null;
  windDirection: number | null;
  waveHeight: number | null;
  wavePeriod: number | null;
  waveDirection: number | null;
};

export type ScoredMoment = ForecastMoment & {
  score: number;
  reasons: string[];
  breakdown: {
    windDirection: number;
    windSpeed: number;
    waveDirection: number;
    wavePeriod: number;
    waveHeight: number;
    cleanWave: number;
  };
};

export function angularDistance(a: number, b: number) {
  const difference = Math.abs(((a - b + 540) % 360) - 180);
  return difference;
}

function directionScore(value: number | null, targets: DirectionTarget[]) {
  if (value === null) return 0;
  return Math.max(
    ...targets.map((target) => {
      const distance = angularDistance(value, target.bearing);
      return Math.max(0, target.peak * (1 - distance / target.width));
    }),
  );
}

function windSpeedScore(value: number | null, hint: SpotRule['windHint']) {
  if (value === null) return 0;
  if (value <= 3) return 0;
  if (value < hint.ideal) return Math.min(100, ((value - 3) / (hint.ideal - 3)) * 100);
  if (value <= hint.upper) return 100 - ((value - hint.ideal) / (hint.upper - hint.ideal)) * 18;
  return Math.max(20, 82 - (value - hint.upper) * 9);
}

function periodScore(value: number | null, hint: number) {
  if (value === null) return 0;
  return Math.max(0, Math.min(100, ((value - 3.5) / (hint + 1 - 3.5)) * 100));
}

function waveHeightScore(value: number | null, hint: number) {
  if (value === null) return 0;
  return Math.max(0, Math.min(100, ((value - 0.25) / (hint + 0.75 - 0.25)) * 100));
}

export function scoreMoment(spot: SpotRule, moment: ForecastMoment): ScoredMoment {
  const windDirection = directionScore(moment.windDirection, spot.windTargets);
  const waveDirection = directionScore(moment.waveDirection, spot.waveTargets);
  const windSpeed = windSpeedScore(moment.windSpeed, spot.windHint);
  const wavePeriod = periodScore(moment.wavePeriod, spot.periodHint);
  const waveHeight = waveHeightScore(moment.waveHeight, spot.minWaveHint);

  const cleanWave =
    spot.cleanWave &&
    moment.windDirection !== null &&
    (moment.wavePeriod ?? 0) >= spot.periodHint &&
    (moment.waveHeight ?? 0) >= spot.minWaveHint
      ? Math.max(
          0,
          spot.cleanWave.bonus *
            (1 - angularDistance(moment.windDirection, spot.cleanWave.bearing) / spot.cleanWave.width),
        )
      : 0;

  const score = Math.round(
    Math.min(
      100,
      windDirection * 0.24 +
        windSpeed * 0.22 +
        waveDirection * 0.2 +
        wavePeriod * 0.22 +
        waveHeight * 0.12 +
        cleanWave,
    ),
  );

  const reasons: string[] = [];
  if (windDirection >= 76) reasons.push('vindretning matcher');
  if (windSpeed >= 70) reasons.push('brugbar vindstyrke');
  if (waveDirection >= 70) reasons.push('bølgeretning matcher');
  if (wavePeriod >= 72) reasons.push(`periode omkring ${spot.periodHint}+ sek.`);
  if (cleanWave >= 6 && spot.cleanWave) reasons.push(`${spot.cleanWave.label} giver renere bølger`);

  return {
    ...moment,
    score,
    reasons,
    breakdown: { windDirection, windSpeed, waveDirection, wavePeriod, waveHeight, cleanWave },
  };
}

export function compassLabel(degrees: number | null) {
  if (degrees === null || Number.isNaN(degrees)) return '—';
  const labels = ['N', 'NØ', 'Ø', 'SØ', 'S', 'SV', 'V', 'NV'];
  return labels[Math.round((((degrees % 360) + 360) % 360) / 45) % 8];
}

export function getSpot(id: string) {
  return SPOTS.find((spot) => spot.id === id);
}
