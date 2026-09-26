import {evaluate,equipped,finite,confidence} from './engine.ts';
import {SPORTS,localRules} from './catalog.ts';
import {MODELS,withMarine} from './providers.ts';
import type {ForecastSnapshot,ObservationSnapshot,Spot,Sport,User} from './types.ts';
export type Bundle={snapshots:ForecastSnapshot[];batchId:string|null;warnings:string[];observations?:ObservationSnapshot[]};
export const dateKey=(v:string|number)=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Copenhagen',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(v));
export const time=(v:string|number)=>new Intl.DateTimeFormat('da-DK',{timeZone:'Europe/Copenhagen',hour:'2-digit',minute:'2-digit'}).format(new Date(v));
export function dayKey(now:number,offset:number){const d=new Date(dateKey(now)+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+offset);return d.toISOString().slice(0,10);}
export function category(s:Sport){return (s.id.includes('foil')&&!s.id.startsWith('wing'))||s.id==='prone'?'Foil':s.name==='Kitesurf'?'Kite':s.name==='Wingfoil'?'Wing':s.name==='Surf'?'Surf':'Other';}
export const direction=(n:number|null|undefined)=>finite(n)?['N','NNØ','NØ','ØNØ','Ø','ØSØ','SØ','SSØ','S','SSV','SV','VSV','V','VNV','NV','NNV'][Math.round(((n%360)+360)%360/22.5)%16]:'—';
export function spotResult(spot:Spot,b:Bundle|undefined,user:User,filter:string,target:string,now:number){
 const personal=user.sportIds.length>0;
 const sports=[...SPORTS,...user.customSports].filter(s=>(!personal||equipped(s,user))&&(filter==='All'||category(s)===filter));
 const model=MODELS.find(m=>b?.snapshots.some(s=>s.model===m.id&&finite(s.weather.wind)));
 const hours=b&&model?withMarine(b.snapshots.filter(s=>s.model===model.id),b.snapshots.filter(s=>s.model==='ecmwf_wam')).filter(s=>Number.isFinite(Date.parse(s.validTime))&&dateKey(s.validTime)===target).sort((a,b)=>Date.parse(a.validTime)-Date.parse(b.validTime)):[];
 const drive=user.travel?.minutesBySpot[spot.id];
 const tooFar=finite(drive)&&finite(user.travel?.maxMinutes)&&drive>user.travel!.maxMinutes;
 const options=hours.flatMap((h,i)=>{
  const next=hours[i+1];if(tooFar||Date.parse(h.validTime)<now||!next||Date.parse(next.validTime)-Date.parse(h.validTime)!==3600000)return [];
  return sports.flatMap(sport=>{
   const checks=[h,next].map(hour=>evaluate({...hour.weather,duration:120},spot,sport,user,localRules(spot,sport)));
   if(checks.some(e=>e.viability!=='eligible'||e.score===null))return [];
   return [{sport,hour:h,end:new Date(Date.parse(h.validTime)+7200000).toISOString(),score:Math.round(checks.reduce((s,e)=>s+e.score!,0)/2),reasons:[...new Map(checks.flatMap(e=>e.reasons).map(r=>[r.ruleId,r])).values()],missing:[...new Set(checks.flatMap(e=>e.missing))],confidence:[h,next].map(hour=>confidence((b?.snapshots??[]).filter(s=>s.validTime===hour.validTime&&s.model!=='ecmwf_wam'),b?.observations??[],now)).sort((a,b)=>['UNAVAILABLE','LOW','MEDIUM','HIGH'].indexOf(a.label)-['UNAVAILABLE','LOW','MEDIUM','HIGH'].indexOf(b.label))[0]}];
  });
 }).sort((a,b)=>b.score-a.score||Date.parse(a.hour.validTime)-Date.parse(b.hour.validTime));
 return {spot,hours,model,options,best:options[0],tooFar,drive};
}
export type SpotResult=ReturnType<typeof spotResult>;
