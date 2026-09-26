import {ENGINE_VERSION} from './types.ts';
import type {Weather,Spot,User,RuleSet,Rule,Predicate,Range,ForecastSnapshot,ForecastConfidence,ObservationSnapshot,ForecastError,Sport,WindowEvaluation} from './types.ts';
export function newId(){if(typeof crypto.randomUUID==='function')return crypto.randomUUID();const b=crypto.getRandomValues(new Uint8Array(16));b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;const h=Array.from(b,n=>n.toString(16).padStart(2,'0')).join('');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;}
export const finite=(x:unknown):x is number=>typeof x==='number'&&Number.isFinite(x);
export const norm=(x:number)=>((x%360)+360)%360;
export const angle=(a:number,b:number)=>Math.abs(norm(a-b+180)-180);
export const sector=(d:number,min:number,max:number)=>norm(d-min)<=norm(max-min);
export function geometry(direction:number|null|undefined,sea:number|null){
 if(!finite(direction)||!finite(sea))return {relativeWind:'unknown',tack:'unknown'};
 const delta=norm(direction-sea),a=angle(direction,sea);
 return {relativeWind:a<22.5?'onshore':a<67.5?'side-onshore':a<=112.5?'side-shore':a<157.5?'cross-offshore':'offshore',tack:delta===0||delta===180?'unknown':delta<180?'starboard':'port'};
}
export function mergeRules(layers:RuleSet[]){
 const ranges=new Map<string,Range>(),soft=new Map<string,Rule>(),hard:Rule[]=[];
 for(const layer of layers){for(const r of layer.ranges)ranges.set(r.parameter,r);for(const r of layer.rules)r.effect==='hard'?hard.push(r):soft.set(r.id,r);}
 return {ranges:[...ranges.values()],rules:[...hard,...soft.values()]};
}
export function rangeFit(v:number,r:Range){if(r.parameter.toLowerCase().includes('direction'))v=r.min+norm(v-r.min);if(v<r.min||v>r.max)return 0;if(v>=r.idealMin&&v<=r.idealMax)return 100;return v<r.idealMin?100*(v-r.min)/(r.idealMin-r.min):100*(r.max-v)/(r.max-r.idealMax);}
export function derived(w:Weather,spot:Spot):Weather{return {...w,gustRatio:finite(w.gust)&&finite(w.wind)&&w.wind>0?w.gust/w.wind:null,waveEnergy:finite(w.swell)&&finite(w.period)?w.swell*w.swell*w.period:null,windSwellAngle:finite(w.direction)&&finite(w.swellDirection)?angle(w.direction,w.swellDirection):null,swellBreakAngle:finite(w.swellDirection)&&finite(spot.geometry.breakOrientation)?angle(w.swellDirection,spot.geometry.breakOrientation):null};}
export function match(p:Predicate,w:Weather,spot:Spot,u:User):boolean|null{
 if(p.op==='is'){const v=p.parameter==='level'?u.level:geometry(w.direction,spot.geometry.seaBearing)[p.parameter];return v==='unknown'?null:v===p.value;}
 const v=w[p.parameter];if(!finite(v))return null;return p.op==='sector'?sector(v,p.min,p.max):p.op==='outside'?v<p.min||v>p.max:v>=p.min&&v<=p.max;
}
export function evaluate(w:Weather,spot:Spot,sport:Sport,user:User,spotRules:RuleSet[]=[]){
 const layers=[sport.ruleset,...spotRules,...user.preferences.filter(p=>p.sportId===sport.id&&(!p.spotId||p.spotId===spot.id)).map(p=>p.ruleset)];
 const merged=mergeRules(layers),weather=derived(w,spot),reasons:WindowEvaluation['reasons']=[],missing:string[]=[];
 let blocked=false,unknown=false,total=0,weight=0;
 for(const r of merged.ranges){const v=weather[r.parameter];if(!finite(v)){missing.push(r.parameter);if(r.required)unknown=true;continue;}const fit=rangeFit(v,r);total+=fit*r.weight;weight+=r.weight;reasons.push({ruleId:r.parameter,layer:'range',message:`${r.parameter}: ${v.toFixed(1)} · ideal ${r.idealMin}–${r.idealMax}`,points:Math.round(fit)});}
 let adjustment=0;
 for(const rule of merged.rules){const states=rule.when.map(p=>match(p,weather,spot,user));if(states.some(s=>s===false))continue;if(states.some(s=>s===null)){if(rule.effect==='hard'){unknown=true;missing.push(rule.name);}continue;}if(rule.effect==='hard')blocked=true;else adjustment+=rule.effect==='boost'?rule.points:-rule.points;reasons.push({ruleId:rule.id,layer:layers.find(l=>l.rules.includes(rule))?.id??'rule',message:rule.name,points:rule.effect==='hard'?null:rule.effect==='boost'?rule.points:-rule.points});}
 if(spot.geometry.dangerousSectors.length){if(!finite(w.direction))unknown=true;else if(spot.geometry.dangerousSectors.some(s=>sector(w.direction!,s.from,s.to))){blocked=true;reasons.push({ruleId:'dangerous-sector',layer:'safety',message:'Vind i spottets farlige sektor',points:null});}}
 if(w.daylight===0){blocked=true;reasons.push({ruleId:'daylight',layer:'safety',message:'Vinduet omfatter mørke',points:null});}else if(!finite(w.daylight))unknown=true;
 if(['beginner','intermediate','experienced'].indexOf(user.level)<['beginner','intermediate','experienced'].indexOf(sport.minimumLevel)){blocked=true;reasons.push({ruleId:'level',layer:'safety',message:'Disciplinens minimumsniveau er ikke opfyldt',points:null});}
 return {score:unknown||!weight?null:Math.round(Math.max(0,Math.min(100,total/weight+adjustment))),viability:blocked?'blocked' as const:unknown?'unknown' as const:'eligible' as const,reasons,missing:[...new Set(missing)],rulesets:layers,weather};
}
export function hasEquipment(sport:Sport,user:User){return sport.equipmentKinds.every(kind=>user.equipment.some(e=>e.kind===kind&&(!e.sportIds.length||e.sportIds.includes(sport.id))));}
export function equipped(sport:Sport,user:User){return user.sportIds.includes(sport.id)&&(!user.equipmentOnly||hasEquipment(sport,user));}
export function compareModels(snapshots:ForecastSnapshot[]){
 const unique=[...new Map(snapshots.map(s=>[`${s.provider}:${s.model}`,s])).values()];
 const same=unique.filter(s=>s.validTime===unique[0]?.validTime&&s.spotId===unique[0]?.spotId);
 const winds=same.map(s=>s.weather.wind).filter(finite),dirs=same.map(s=>s.weather.direction).filter(finite);
 return {windSpread:winds.length>=2?Math.max(...winds)-Math.min(...winds):null,directionSpread:dirs.length>=2?Math.max(...dirs.flatMap(a=>dirs.map(b=>angle(a,b)))):null,families:new Set(same.filter(s=>finite(s.weather.wind)&&finite(s.weather.direction)).map(s=>s.family)).size};
}
export function confidence(snapshots:ForecastSnapshot[],observations:ObservationSnapshot[]=[],now=Date.now()):ForecastConfidence{
 const spread=compareModels(snapshots),lead=snapshots[0]?(Date.parse(snapshots[0].validTime)-now)/3600000:null;
 const input={...spread,snapshotIds:snapshots.map(s=>s.id),observationIds:observations.map(o=>o.id),runStability:null,leadHours:lead};
 const absent=!snapshots.length||spread.families<2||snapshots.some(s=>!s.modelRun||!Number.isFinite(Date.parse(s.modelRun))||!Number.isFinite(Date.parse(s.retrievedAt))||now-Date.parse(s.retrievedAt)>21600000||Date.parse(s.retrievedAt)>now+60000)||spread.windSpread===null||spread.directionSpread===null;
 return {label:absent?'UNAVAILABLE':spread.windSpread!>4||spread.directionSpread!>45||lead!>72?'LOW':'MEDIUM',method:'evidence-gates-v1; not a probability',input,reasons:absent?['Modelrun eller tilstrækkeligt sammenlignelige modeller mangler.']:['Kvalitativ modelenighed; lokal træfsikkerhed er endnu ikke valideret.']};
}
export function forecastError(f:ForecastSnapshot,o:ObservationSnapshot,now=Date.now()):ForecastError|null{
 const v=f.weather[o.variable],run=f.modelRun?Date.parse(f.modelRun):NaN,valid=Date.parse(f.validTime),measured=Date.parse(o.timestamp);
 if(!finite(v)||!finite(o.value)||!Number.isFinite(valid)||!Number.isFinite(measured)||valid>now||measured>now||!Number.isFinite(run)||run>valid||Date.parse(f.retrievedAt)>valid||Math.abs(valid-measured)>30*60000||o.distanceKm===null||o.distanceKm>10||o.quality.status!=='verified'||o.type==='session')return null;
 const units:Partial<Record<keyof Weather,string>>={wind:'m/s',gust:'m/s',direction:'degrees',swell:'m',swellDirection:'degrees',period:'s',temperature:'°C'};
 if(units[o.variable]!==o.unit)return null;
 return {id:`${f.id}:${o.id}`,forecastId:f.id,observationId:o.id,model:f.model,spotId:f.spotId,variable:o.variable,predicted:v,observed:o.value,error:o.variable.toLowerCase().includes('direction')?norm(o.value-v+180)-180:o.value-v,horizonHours:(valid-run)/3600000,method:'observed-minus-predicted; verified; <=10km, <=30min; v1'};
}
export function compareWindows(opts:{spot:Spot;sport:Sport;user:User;hours:ForecastSnapshot[];allModels:ForecastSnapshot[];start:number;end:number;driveMinutes:number;maxDrive:number;durationMinutes:number;includeTravel?:boolean;spotRules?:RuleSet[];observations?:ObservationSnapshot[]}):WindowEvaluation[]{
 const {spot,sport,user,start,end,driveMinutes,maxDrive,durationMinutes}=opts;
 if(!equipped(sport,user)||![start,end,driveMinutes,maxDrive,durationMinutes].every(finite)||driveMinutes<0||driveMinutes>maxDrive||durationMinutes<60||end<=start)return [];
 const hours=[...opts.hours].sort((a,b)=>Date.parse(a.validTime)-Date.parse(b.validTime)),results:WindowEvaluation[]=[];
 for(let i=0;i<hours.length;i++){
 const at=Date.parse(hours[i].validTime),finish=at+durationMinutes*60000;
 if(at<start+(opts.includeTravel===false?0:(driveMinutes+30)*60000)||finish>end-(opts.includeTravel===false?0:(driveMinutes+20)*60000))continue;
 const slice=hours.slice(i,i+Math.ceil(durationMinutes/60));
 if(slice.length<Math.ceil(durationMinutes/60)||slice.some((h,j)=>Date.parse(h.validTime)!==at+j*3600000))continue;
 const evaluated=slice.map(h=>evaluate({...h.weather,duration:durationMinutes},spot,sport,user,opts.spotRules));
 const first=evaluated[0],viability=evaluated.some(e=>e.viability==='blocked')?'blocked':evaluated.some(e=>e.viability==='unknown')?'unknown':'eligible';
 const confidences=slice.map(h=>confidence(opts.allModels.filter(s=>s.validTime===h.validTime),opts.observations??[]));
 const conf=confidences.sort((a,b)=>['UNAVAILABLE','LOW','MEDIUM','HIGH'].indexOf(a.label)-['UNAVAILABLE','LOW','MEDIUM','HIGH'].indexOf(b.label))[0];
 results.push({id:newId(),schemaVersion:1,engineVersion:ENGINE_VERSION,createdAt:new Date().toISOString(),sportId:sport.id,spotId:spot.id,start:new Date(at).toISOString(),end:new Date(finish).toISOString(),score:evaluated.some(e=>e.score===null)?null:Math.round(evaluated.reduce((s,e)=>s+e.score!,0)/evaluated.length),viability,reasons:[...new Map(evaluated.flatMap(e=>e.reasons).map(r=>[r.ruleId,r])).values()],missing:[...new Set(evaluated.flatMap(e=>e.missing))],forecastIds:opts.allModels.filter(s=>Date.parse(s.validTime)>=at&&Date.parse(s.validTime)<finish).map(s=>s.id),observationIds:(opts.observations??[]).map(o=>o.id),confidence:conf,rulesets:first.rulesets,profile:structuredClone(user),weather:first.weather,modelVersion:null,spot:structuredClone(spot)});
 }
 return results.sort((a,b)=>(b.score??-1)-(a.score??-1));
}
export function runStability(previous:ForecastSnapshot[],latest:ForecastSnapshot[]){
 const pairs=latest.flatMap(b=>{const a=previous.find(a=>a.model===b.model&&a.spotId===b.spotId&&a.validTime===b.validTime&&a.modelRun&&b.modelRun&&Date.parse(a.modelRun)<Date.parse(b.modelRun));return a&&finite(a.weather.wind)&&finite(b.weather.wind)?[{difference:b.weather.wind-a.weather.wind}]:[];});
 return {count:pairs.length,meanAbsoluteWindChange:pairs.length?pairs.reduce((s,p)=>s+Math.abs(p.difference),0)/pairs.length:null};
}
export function trendAgreement(snapshots:ForecastSnapshot[],start:string,end:string){const models=[...new Set(snapshots.map(s=>s.model))];const trends=models.flatMap(model=>{const a=snapshots.find(s=>s.model===model&&s.validTime===start),b=snapshots.find(s=>s.model===model&&s.validTime===end);return a&&b&&a.spotId===b.spotId&&finite(a.weather.wind)&&finite(b.weather.wind)?[Math.sign(b.weather.wind-a.weather.wind)]:[];});return {models:trends.length,agreement:trends.length>=2?trends.every(t=>t===trends[0]):null};}
export function mlEligible(m:import('./types.ts').MLModelVersion){return m.approved&&finite(m.holdoutScore)&&finite(m.baselineScore)&&m.holdoutScore<m.baselineScore&&Number.isFinite(Date.parse(m.trainingCutoff));}
