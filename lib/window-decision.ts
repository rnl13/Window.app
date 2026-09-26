// MVP v1: deliberately explainable research rules, not calibrated probabilities.
export type Conditions = {wind: number | null; direction: number | null; gust: number | null; wave: number | null; period: number | null; waveDirection: number | null};
export type Profile = {windMin: number; windIdeal: number; windMax: number; gustMax: number; waveMin: number; waveIdeal: number; waveMax: number; periodIdeal: number; directionIdeal: number; waveDirectionIdeal: number};
export const angle = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);
const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
const clamp = (n: number) => Math.max(0, Math.min(1,n));
function fit(n: number, low: number, ideal: number, high: number) {
  return n <= ideal ? clamp((n-low)/(ideal-low)) : clamp((high-n)/(high-ideal));
}
export function windowScore(c: Conditions, p: Profile) {
  if (!Object.values(c).every(finite)) return {score: null, reasons:['Kritiske vejrdata mangler.'], breakdown: null};
  if (!Object.values(p).every(finite) || !(p.windMin<p.windIdeal && p.windIdeal<p.windMax && p.waveMin<p.waveIdeal && p.waveIdeal<p.waveMax && p.periodIdeal>0 && p.gustMax>0)) return {score:null,reasons:['Profilens intervaller er ugyldige.'],breakdown:null};
  const wind=c.wind!, gust=c.gust!, wave=c.wave!;
  if (wind<0 || gust<wind || wave<0 || c.period!<=0 || c.direction!<0 || c.direction!>=360 || c.waveDirection!<0 || c.waveDirection!>=360) return {score:null,reasons:['Vejrdata er ugyldige.'],breakdown:null};
  if (wind<p.windMin || wind>p.windMax || gust>p.gustMax || wave<p.waveMin || wave>p.waveMax) return {score:null,reasons:['Forholdene overskrider profilens hårde grænser.'],breakdown:null};
  const breakdown={
    wind:25*fit(wind,p.windMin,p.windIdeal,p.windMax),
    direction:20*clamp(1-angle(c.direction!,p.directionIdeal)/90),
    gust:15*clamp(1-(gust-wind)/Math.max(wind,1)),
    wave:20*fit(wave,p.waveMin,p.waveIdeal,p.waveMax),
    period:10*clamp(c.period!/p.periodIdeal),
    waveDirection:10*clamp(1-angle(c.waveDirection!,p.waveDirectionIdeal)/90),
  };
  return {score:Math.round(Object.values(breakdown).reduce((a,b)=>a+b,0)),breakdown,reasons:['Vejrmatch for waveprofil, hvis prognosen holder.','Transport og forecastusikkerhed indgår separat.']};
}
export type Evidence = {criticalComplete:boolean; fetchedAgeHours:number; runAgeHours:number|null; leadHours:number; familyCount:number; windRange:number; directionRange:number; timingSpreadHours:number; stableRuns:number; locallyValidated:boolean};
export function forecastConfidence(e: Evidence): {label:'UNAVAILABLE'|'LOW'|'MEDIUM'|'HIGH'; reasons:string[]} {
  const numbers=[e.fetchedAgeHours,e.leadHours,e.familyCount,e.windRange,e.directionRange,e.timingSpreadHours,e.stableRuns];
  if (!e.criticalComplete || numbers.some(x=>!finite(x)||x<0) || e.fetchedAgeHours>6 || e.runAgeHours===null || !finite(e.runAgeHours) || e.runAgeHours<0 || e.runAgeHours>12) return {label:'UNAVAILABLE',reasons:['Datadækning eller modeltidspunkt er utilstrækkeligt.']};
  if(e.leadHours>72 || e.familyCount<2 || e.windRange>4 || e.directionRange>45 || e.timingSpreadHours>3) return {label:'LOW',reasons:['Lang horisont eller utilstrækkelig enighed om samme tidsvindue.']};
  if(e.locallyValidated && e.leadHours<=24 && e.windRange<=2 && e.directionRange<=20 && e.timingSpreadHours<=1 && e.stableRuns>=2) return {label:'HIGH',reasons:['Kort horisont, stabilt grundlag og dokumenteret lokal verifikation.']};
  return {label:'MEDIUM',reasons:['Foreløbigt sammenhængende prognoser. Lokal træfsikkerhed er ikke tilstrækkeligt dokumenteret til HIGH.']};
}
export type Trip = {earliestDeparture:number; latestReturn:number; windowStart:number; windowEnd:number; daylightEnd:number; outbound:number; inbound:number; rig:number; pack:number; minWater:number; maxDrive:number};
export function tripWindow(t:Trip) {
  if(!Object.values(t).every(finite) || [t.outbound,t.inbound,t.rig,t.pack,t.minWater,t.maxDrive].some(x=>x<0) || t.latestReturn<=t.earliestDeparture || t.windowEnd<=t.windowStart) return {feasible:false,reason:'Ugyldig tidsramme.',waterMinutes:0,start:0,end:0};
  const start=Math.max(t.windowStart,t.earliestDeparture+t.outbound+t.rig);
  const end=Math.min(t.windowEnd,t.daylightEnd,t.latestReturn-t.inbound-t.pack);
  const waterMinutes=Math.max(0,end-start);
  const feasible=Math.max(t.outbound,t.inbound)<=t.maxDrive && waterMinutes>=t.minWater && waterMinutes>0;
  return {feasible,reason:feasible?'Turen passer i den ledige tid.':'Transport eller vandtid overskrider dine grænser.',waterMinutes,start,end};
}
export function decision(score:number|null, confidence:ReturnType<typeof forecastConfidence>['label'], feasible:boolean, spotVerified:boolean) {
  if (!spotVerified || confidence==='UNAVAILABLE') return 'INSUFFICIENT_DATA';
  if(!feasible || score===null || score<55) return 'NO_MATCH';
  if(confidence!=='HIGH') return 'WAIT';
  return 'GO_CANDIDATE'; // A plan suggestion, never a safety certification.
}
export function memberSupport(events:Array<boolean|null>) {
  const valid=events.filter((v):v is boolean=>typeof v==='boolean');
  return {support:valid.filter(Boolean).length,available:valid.length,expected:events.length,rawFraction:valid.length?valid.filter(Boolean).length/valid.length:null};
}
