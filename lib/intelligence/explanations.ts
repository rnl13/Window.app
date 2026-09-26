import {derived,finite,geometry,mergeRules} from './engine.ts';
import {MODELS,withMarine} from './providers.ts';
import type {ForecastSnapshot,WindowEvaluation} from './types.ts';
const names:Record<string,[string,string]>={wind:['Vind','m/s'],gust:['Vindstød','m/s'],swell:['Swell','m'],period:['Swellperiode','s'],windWave:['Vindbølger','m'],windWavePeriod:['Vindbølgeperiode','s'],temperature:['Temperatur','°C'],precipitation:['Nedbør','mm'],duration:['Vandtid','min']};
const number=(n:number)=>n.toLocaleString('da-DK',{maximumFractionDigits:1});
export function explainWindow(window:WindowEvaluation,snapshots:ForecastSnapshot[]){
 const model=MODELS.find(m=>snapshots.some(s=>s.model===m.id&&finite(s.weather.wind)));
 const hours=withMarine(snapshots.filter(s=>s.model===model?.id),snapshots.filter(s=>s.model==='ecmwf_wam')).filter(s=>Date.parse(s.validTime)>=Date.parse(window.start)&&Date.parse(s.validTime)<Date.parse(window.end));
 const {ranges}=mergeRules(window.rulesets);
 const conditions=ranges.flatMap(r=>{const named=names[r.parameter];if(!named)return [];const values=hours.map(h=>derived({...h.weather,duration:(Date.parse(window.end)-Date.parse(window.start))/60000},window.spot)[r.parameter]).filter(finite);if(!values.length)return [];
 const min=Math.min(...values),max=Math.max(...values),ideal=values.every(v=>v>=r.idealMin&&v<=r.idealMax);
 return [`${named[0]} ${number(min)}${max!==min?'–'+number(max):''} ${named[1]}. ${ideal?'Inden for':'Ikke hele tiden inden for'} det foretrukne interval på ${number(r.idealMin)}–${number(r.idealMax)} ${named[1]}.`];});
 const windNames:Record<string,string>={'onshore':'pålandsvind','side-onshore':'skrå pålandsvind','side-shore':'vind langs kysten','cross-offshore':'skrå fralandsvind','offshore':'fralandsvind'};
 const directions=[...new Set(hours.map(h=>geometry(h.weather.direction,window.spot.geometry.seaBearing).relativeWind))];
 const direction=directions.length&&directions.every(d=>windNames[d])?`Vindretningen giver ${directions.map(d=>windNames[d]).join(' / ')} ud fra spottets ${window.spot.geometry.evidence==='verified'?'registrerede':'foreløbige'} kystretning.`:null;
 const retrieved=hours.map(h=>Date.parse(h.retrievedAt)).filter(Number.isFinite);
 return {conditions,direction,model:model?.label??'Ukendt model',retrievedAt:retrieved.length?new Date(Math.min(...retrieved)).toISOString():null};
}
