import type {ForecastSnapshot,ObservationSnapshot} from './types.ts';
type Payload={snapshots:ForecastSnapshot[];warnings:string[];observations:ObservationSnapshot[];satelliteStatus:string;observationStatus:string};
export type StoredBundle=Payload & {batchId:string|null;stored:boolean;cached?:boolean};
type Dependencies={read:()=>Promise<StoredBundle|null>;forecast:()=>Promise<{snapshots:ForecastSnapshot[];warnings:string[]}>;observe:()=>Promise<ObservationSnapshot[]>;write:(payload:Payload)=>Promise<string>;log:(stage:string,error:unknown)=>void};
// Persistence is optional for recommendations, mandatory only for a saved evaluation.
export async function loadBundle(deps:Dependencies):Promise<StoredBundle>{
 try{const cached=await deps.read();if(cached&&Array.isArray(cached.snapshots)&&cached.snapshots.some(s=>Number.isFinite(s.weather.wind)))return cached;}catch(e){deps.log('cache-read',e);}
 const [result,observations]=await Promise.all([deps.forecast(),deps.observe().catch(e=>{deps.log('observations',e);return [];})]);
 if(!result.snapshots.some(s=>Number.isFinite(s.weather.wind)))throw new Error('Ingen vindprognoser: '+result.warnings.join('; '));
 const payload:Payload={...result,observations,satelliteStatus:'unavailable',observationStatus:observations.length?'raw-station-data':'unavailable'};
 try{return {...payload,batchId:await deps.write(payload),stored:true};}catch(e){deps.log('cache-write',e);return {...payload,batchId:null,stored:false,warnings:[...payload.warnings,'Prognosen kan vises, men kunne ikke gemmes til sessionsdagbogen.']};}
}
