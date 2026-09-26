import {compareWindows,finite} from './engine.ts';
import {localRules} from './catalog.ts';
import {dateKey} from './explore.ts';
import {MODELS,withMarine} from './providers.ts';
import type {Bundle} from './explore.ts';
import type {Spot,Sport,User} from './types.ts';
// Water-time suggestions deliberately exclude transport. A trip requires a separate calculation.
export function suggestForDay(spot:Spot,sport:Sport,user:User,bundle:Bundle,day:string,now=Date.now()){
 const model=MODELS.find(m=>bundle.snapshots.some(s=>s.model===m.id&&finite(s.weather.wind)));
 if(!model)return [];
 const hours=withMarine(bundle.snapshots.filter(s=>s.model===model.id),bundle.snapshots.filter(s=>s.model==='ecmwf_wam')).filter(h=>dateKey(h.validTime)===day).sort((a,b)=>Date.parse(a.validTime)-Date.parse(b.validTime));
 if(!hours.length)return [];
 return compareWindows({spot,sport,user,hours,allModels:bundle.snapshots,start:Math.max(now,Date.parse(hours[0].validTime)),end:Date.parse(hours[hours.length-1].validTime)+3600000,driveMinutes:0,maxDrive:0,durationMinutes:120,includeTravel:false,spotRules:localRules(spot,sport),observations:bundle.observations??[]}).filter(w=>w.viability==='eligible');
}
