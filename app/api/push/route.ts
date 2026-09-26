import {db,json,userId} from '@/lib/calendar-db';
import {sameOrigin,digest,seal} from '@/lib/calendar-security';
import {SPOTS} from '@/lib/kite-rules';
import {validSubscription} from '@/lib/push-model';
import {pushEnv,pushReady,sendPush} from '@/lib/push-server';
export async function GET(r:Request){
 const user=await userId(r),e=pushEnv();
 let lastCheck=null;try{lastCheck=(await db().prepare("SELECT last_success FROM push_jobs WHERE id='weather'").first<{last_success:number}>())?.last_success??null;}catch{}
 return json({authenticated:!!user,configured:pushReady(),publicKey:e.PUSH_PUBLIC_KEY??null,schedulerActive:e.PUSH_SCHEDULER_ENABLED==='true'&&!!lastCheck&&Date.now()-lastCheck<90*60000,lastCheck});
}
export async function POST(r:Request){
 if(!sameOrigin(r)||!r.headers.get('content-type')?.startsWith('application/json'))return json({error:'Ugyldig forespørgsel.'},403);
 const user=await userId(r);if(!user)return json({error:'Log ind først.'},401);
 if(!pushReady())return json({error:'Push er ikke aktiveret endnu.'},503);
 let b:any;try{const raw=await r.text();if(raw.length>6000)throw Error();b=JSON.parse(raw);}catch{return json({error:'Ugyldige oplysninger.'},400);}
 if(!validSubscription(b.subscription))return json({error:'Ugyldigt pushabonnement.'},400);
 const id=await digest(b.subscription.endpoint);
 try{
 if(b.action==='read'){const row=await db().prepare('SELECT spots,threshold FROM push_subscriptions WHERE id=? AND user_id=?').bind(id,user).first<{spots:string;threshold:number}>();return json(row?{spots:JSON.parse(row.spots),threshold:row.threshold}:{spots:[],threshold:80});}
 if(b.action==='remove'){await db().prepare('DELETE FROM push_subscriptions WHERE id=? AND user_id=?').bind(id,user).run();return json({ok:true});}
 if(b.action==='test'){
 const row=await db().prepare('UPDATE push_subscriptions SET last_test=? WHERE id=? AND user_id=? AND last_test<? RETURNING subscription,user_id').bind(Date.now(),id,user,Date.now()-60000).first<{subscription:string;user_id:string}>();
 if(!row)return json({error:'Gem tilmeldingen først, eller vent et minut mellem tests.'},429);
 const status=await sendPush(row,{title:'Window · Testbesked',body:'Push fungerer på denne enhed, hvis du kan se denne besked. Dette er ikke et vindvarsel.',tag:'window-test'});
 if(status===404||status===410)await db().prepare('DELETE FROM push_subscriptions WHERE id=? AND user_id=?').bind(id,user).run();
 return status>=200&&status<300?json({ok:true,message:'Push-tjenesten har accepteret beskeden. Bekræft på telefonen, at du så den.'}):json({error:'Push-tjenesten afviste beskeden. Prøv at slå push fra og til igen.'},502);
 }
 if(b.action!=='subscribe'||!Array.isArray(b.spots)||b.spots.length<1||b.spots.length>SPOTS.length||b.spots.some((s:any)=>!SPOTS.some(p=>p.id===s))||!Number.isInteger(b.threshold)||b.threshold<55||b.threshold>90)return json({error:'Vælg spots og en minimumsscore fra 55 til 90.'},400);
 const encoded=await seal(JSON.stringify({endpoint:b.subscription.endpoint,keys:b.subscription.keys,expirationTime:null}),pushEnv().PUSH_STORAGE_KEY!,user);
 // Atomic bounded pilot registration; never transfer another user's endpoint.
 const saved=await db().prepare(`INSERT INTO push_subscriptions(id,user_id,subscription,spots,threshold,updated_at,last_test)
 SELECT ?,?,?,?,?,?,0 WHERE ((SELECT COUNT(*) FROM push_subscriptions WHERE user_id=?)<3 AND (SELECT COUNT(*) FROM push_subscriptions)<100) OR EXISTS(SELECT 1 FROM push_subscriptions WHERE id=? AND user_id=?)
 ON CONFLICT(id) DO UPDATE SET subscription=excluded.subscription,spots=excluded.spots,threshold=excluded.threshold,updated_at=excluded.updated_at WHERE push_subscriptions.user_id=excluded.user_id RETURNING id`).bind(id,user,encoded,JSON.stringify([...new Set(b.spots)]),b.threshold,Date.now(),user,id,user).first();
 if(!saved)return json({error:'Tilmeldingen kunne ikke gemmes. Pilotgrænsen er nået, eller enheden tilhører en anden Window-konto.'},409);
 return json({ok:true});
 }catch{return json({error:'Push kunne ikke gennemføres. Prøv igen.'},503);}
}
