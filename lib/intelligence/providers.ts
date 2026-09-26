import type {ForecastProvider,ForecastSnapshot,Spot,Weather,ObservationProvider,ObservationSnapshot} from './types.ts';
import {finite} from './engine.ts';
import {isDaylightAt} from '../daylight.ts';

export async function providerJson(url:URL){
 const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;
 try{return await Promise.race([(async()=>{const response=await fetch(url,{signal:controller.signal,headers:{Accept:'application/json'}});if(!response.ok){await response.body?.cancel();throw new Error(`HTTP ${response.status}`);}return response.json();})(),new Promise<never>((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('Provider timeout after 8s'));},8000);})]);}finally{if(timer)clearTimeout(timer);}
}

const variables:Record<string,keyof Weather>={wind_speed_10m:'wind',wind_gusts_10m:'gust',wind_direction_10m:'direction',temperature_2m:'temperature',precipitation:'precipitation',swell_wave_height:'swell',swell_wave_direction:'swellDirection',swell_wave_period:'period',wind_wave_height:'windWave',wind_wave_direction:'windWaveDirection',wind_wave_period:'windWavePeriod'};
export const MODELS=[{id:'ecmwf_ifs025',family:'ECMWF',resolutionKm:25,label:'ECMWF IFS'},{id:'gfs_global',family:'NOAA',resolutionKm:25,label:'GFS'},{id:'dmi_harmonie_arome_europe',family:'DMI',resolutionKm:2,label:'DMI HARMONIE'},{id:'ecmwf_aifs025_single',family:'ECMWF',resolutionKm:25,label:'ECMWF AIFS'}];
export function parseForecast(payload:any,spot:Spot,model:string,family:string,resolutionKm:number|null,retrievedAt:string):ForecastSnapshot[]{
 const h=payload?.hourly;if(!Array.isArray(h?.time))return [];
 return h.time.flatMap((time:unknown,i:number)=>{
 if(typeof time!=='string')return [];const ms=Date.parse(time.endsWith('Z')?time:time+'Z');if(!Number.isFinite(ms))return [];
 const validTime=new Date(ms).toISOString(),weather:Weather={daylight:isDaylightAt(validTime,spot.lat,spot.lon)?1:0};
 for(const [key,param] of Object.entries(variables))if(Array.isArray(h[key]))weather[param]=finite(h[key][i])?h[key][i]:null;
 // No inference from retrieval time, API generationtime_ms, or nominal publication schedules.
 return [{id:crypto.randomUUID(),schemaVersion:1 as const,spotId:spot.id,provider:'Open-Meteo',model,family,modelRun:null,createdAt:null,retrievedAt,validTime,coordinates:{lat:spot.lat,lon:spot.lon},gridCoordinates:finite(payload.latitude)&&finite(payload.longitude)?{lat:payload.latitude,lon:payload.longitude}:null,resolutionKm,weather,quality:{status:'provider' as const,notes:['Model run unavailable in this response; hourly values may be interpolated.']}}];
 });
}
export class OpenMeteoProvider implements ForecastProvider{
 id:string; model:string; family:string; resolutionKm:number|null; marine:boolean;
 constructor(model:string,family:string,resolutionKm:number|null,marine=false){this.id=`open-meteo:${model}`;this.model=model;this.family=family;this.resolutionKm=resolutionKm;this.marine=marine;}
 async fetch(spot:Spot){
 const url=new URL(this.marine?'https://marine-api.open-meteo.com/v1/marine':'https://api.open-meteo.com/v1/forecast');
 url.search=new URLSearchParams({latitude:String(spot.lat),longitude:String(spot.lon),hourly:this.marine?'swell_wave_height,swell_wave_direction,swell_wave_period,wind_wave_height,wind_wave_direction,wind_wave_period':this.model==='ecmwf_aifs025_single'?'wind_speed_10m,wind_direction_10m,temperature_2m,precipitation':'wind_speed_10m,wind_gusts_10m,wind_direction_10m,temperature_2m,precipitation',models:this.model,forecast_days:'5',timezone:'GMT',...(this.marine?{cell_selection:'sea'}:{wind_speed_unit:'ms'})}).toString();
 const payload=await providerJson(url);
 const rows=parseForecast(payload,spot,this.model,this.family,this.resolutionKm,new Date().toISOString());if(!rows.length)throw new Error(`${this.model}: ingen data`);return rows;
 }
}
// Explicit interface-only adapters. Never substitute forecast "current" values for observations.
export class UnavailableObservationProvider implements ObservationProvider{
 id:string; reason:string;
 constructor(id:string,reason:string){this.id=id;this.reason=reason;}
 async fetch(_spot:Spot):Promise<ObservationSnapshot[]>{return [];}
}
export const observationProviders=[new UnavailableObservationProvider('station','Station matching and quality control not connected'),new UnavailableObservationProvider('buoy','Not connected'),new UnavailableObservationProvider('satellite-ascat','Swath ingestion and coastal quality filtering not connected'),new UnavailableObservationProvider('radar','Not connected')];
export async function fetchModels(spot:Spot){
 const providers=[...MODELS.map(m=>new OpenMeteoProvider(m.id,m.family,m.resolutionKm)),new OpenMeteoProvider('ecmwf_wam','ECMWF-WAM',25,true)];
 const results=await Promise.allSettled(providers.map(p=>p.fetch(spot)));
 return {snapshots:results.flatMap(r=>r.status==='fulfilled'?r.value:[]),warnings:results.flatMap((r,i)=>r.status==='rejected'?[`${providers[i].id}: ${r.reason instanceof Error?r.reason.message:String(r.reason)}`]:[])};
}
export function withMarine(wind:ForecastSnapshot[],marine:ForecastSnapshot[]):ForecastSnapshot[]{const byTime=new Map(marine.map(s=>[s.validTime,s]));return wind.map(s=>({...s,weather:{...byTime.get(s.validTime)?.weather,...s.weather}}));}
export function stationDistance(a:{lat:number;lon:number},b:{lat:number;lon:number}){const rad=(n:number)=>n*Math.PI/180;const x=Math.sin(rad(b.lat-a.lat)/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(rad(b.lon-a.lon)/2)**2;return 6371*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));}
export function parseDmiObservations(payload:any,spot:Spot):ObservationSnapshot[]{
 if(!Array.isArray(payload?.features))return [];const byStation=new Map<string,ObservationSnapshot>();
 for(const f of payload.features){const p=f.properties,c=f.geometry?.coordinates;if(p?.parameterId!=='wind_speed'||!finite(p.value)||p.value<0||!Array.isArray(c)||!c.every(finite)||!Number.isFinite(Date.parse(p.observed))||typeof f.id!=='string')continue;const location={lat:c[1],lon:c[0]},distanceKm=stationDistance({lat:spot.lat,lon:spot.lon},location);if(distanceKm>50)continue;const o:ObservationSnapshot={id:`${spot.id}:dmi:${f.id}`,schemaVersion:1,source:`DMI metObs · ${p.stationId}`,type:'station',timestamp:p.observed,location,variable:'wind',value:p.value,unit:'m/s',quality:{status:'unverified',notes:['DMI raw metObs; not quality controlled. Station exposure may differ from launch.']},spatialResolutionKm:null,distanceKm,relevance:'Nearby station; local representativeness not verified'};const old=byStation.get(p.stationId);if(!old||Date.parse(o.timestamp)>Date.parse(old.timestamp))byStation.set(p.stationId,o);}
 return [...byStation.values()].sort((a,b)=>a.distanceKm!-b.distanceKm!);
}
export class DmiObservationProvider implements ObservationProvider{
 id='dmi-metobs';
 async fetch(spot:Spot){const u=new URL('https://opendataapi.dmi.dk/v2/metObs/collections/observation/items');const now=Date.now();u.search=new URLSearchParams({bbox:`${spot.lon-.5},${spot.lat-.3},${spot.lon+.5},${spot.lat+.3}`,parameterId:'wind_speed',datetime:new Date(now-7200000).toISOString()+'/'+new Date(now).toISOString(),limit:'500'}).toString();return parseDmiObservations(await providerJson(u),spot);}
}
