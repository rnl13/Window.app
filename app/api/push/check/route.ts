import {GET as forecast} from '@/app/api/forecast/route';
import {db,json} from '@/lib/calendar-db';
import {digest} from '@/lib/calendar-security';
import {pushEnv,pushReady,sendPush} from '@/lib/push-server';
import {SPOTS,scoreMoment} from '@/lib/kite-rules';
import {isDaylightAt} from '@/lib/daylight';
export async function POST(r:Request){
 const e=pushEnv();if(!e.PUSH_JOB_SECRET||await digest(r.headers.get('authorization')??'')!==await digest('Bearer '+e.PUSH_JOB_SECRET))return json({error:'Unauthorized'},401);
 if(!pushReady())return json({error:'Not configured'},503);
 const now=Date.now();let locked=false;
 try{
 await db().prepare("INSERT OR IGNORE INTO push_jobs(id,lease_until) VALUES('weather',0)").run();
 const lock=await db().prepare("UPDATE push_jobs SET lease_until=? WHERE id='weather' AND lease_until<? AND (last_success IS NULL OR last_success<?) RETURNING id").bind(now+10*60000,now,now-15*60000).first();
 if(!lock)return json({skipped:true});locked=true;
 const rows=(await db().prepare('SELECT id,user_id,subscription,spots,threshold FROM push_subscriptions').all<any>()).results;
 let accepted=0,failed=0;
 if(rows.length){
 const response=await forecast();if(!response.ok)throw Error('Weather unavailable');const data:any=await response.json();
 if(!Number.isFinite(Date.parse(data.generatedAt))||now-Date.parse(data.generatedAt)>30*60000)throw Error('Stale weather');
 for(let offset=0;offset<rows.length;offset+=5)await Promise.all(rows.slice(offset,offset+5).map(async row=>{
 const spots=JSON.parse(row.spots);
 const candidates=SPOTS.filter(s=>spots.includes(s.id)).flatMap(spot=>(data.forecast[spot.id]??[]).filter((m:any)=>[m.windSpeed,m.windDirection,m.waveHeight,m.waveDirection,m.wavePeriod].every(v=>typeof v==='number'&&Number.isFinite(v))&&Date.parse(m.time)>now&&Date.parse(m.time)<now+24*3600000&&isDaylightAt(m.time,spot.coordinates.lat,spot.coordinates.lon)).map((m:any)=>({spot,m:scoreMoment(spot,m)}))).filter(x=>x.m.score>=row.threshold).sort((a,b)=>b.m.score-a.m.score);
 const best=candidates[0];if(!best)return;
 const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Copenhagen',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 const id=await digest(row.id+':'+day);
 // At most one attempt per device/day. Ambiguous sends are not retried automatically.
 const claim=await db().prepare('INSERT OR IGNORE INTO push_deliveries(id,status,updated_at) VALUES(?,?,?) RETURNING id').bind(id,'pending',now).first();if(!claim)return;
 try{
 const when=new Intl.DateTimeFormat('da-DK',{timeZone:'Europe/Copenhagen',weekday:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(best.m.time));
 const status=await sendPush(row,{title:best.spot.name+' ser lovende ud',body:`${when} · Score ${best.m.score}/100. Prognosens sikkerhed er ikke vurderet. Åbn Window og tjek forholdene.`,tag:'window-weather-'+day});
 const ok=status>=200&&status<300;if(ok)accepted++;else failed++;
 await db().prepare('UPDATE push_deliveries SET status=? WHERE id=?').bind(ok?'accepted':'failed',id).run();
 if(status===404||status===410)await db().prepare('DELETE FROM push_subscriptions WHERE id=?').bind(row.id).run();
 }catch{failed++;await db().prepare("UPDATE push_deliveries SET status='unknown' WHERE id=?").bind(id).run();}
 }));
 }
 await db().prepare("UPDATE push_jobs SET last_success=? WHERE id='weather'").bind(Date.now()).run();
 await db().prepare('DELETE FROM push_deliveries WHERE updated_at<?').bind(now-30*86400000).run();
 return json({accepted,failed,subscriptions:rows.length});
 }catch{return json({error:'Weather check failed; no success recorded'},503);}
 finally{if(locked)await db().prepare("UPDATE push_jobs SET lease_until=0 WHERE id='weather'").run().catch(()=>{});}
}
