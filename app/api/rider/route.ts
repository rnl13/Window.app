import {db,json,userId} from '@/lib/calendar-db';
import {validUser,validFeedback} from '@/lib/intelligence/validation';
import {PLACES,SPORTS,localRules} from '@/lib/intelligence/catalog';
import {compareWindows} from '@/lib/intelligence/engine';
import {withMarine} from '@/lib/intelligence/providers';
function sameOrigin(r:Request){return r.headers.get('origin')===new URL(r.url).origin;}
export async function GET(r:Request){const uid=await userId(r);if(!uid)return json({error:'Log ind for at hente din profil'},401);try{const p=await db().prepare('SELECT payload FROM rider_profiles WHERE user_id=?').bind(uid).first<{payload:string}>();const records=await db().prepare('SELECT id,kind,payload FROM rider_records WHERE user_id=? ORDER BY created_at DESC LIMIT 100').bind(uid).all();return json({profile:p?JSON.parse(p.payload):null,records:records.results.map((x:any)=>({...x,payload:JSON.parse(x.payload)}))});}catch{return json({error:'Profilen kunne ikke hentes'},503);}}
export async function DELETE(r:Request){const uid=await userId(r);if(!uid)return json({error:'Log ind'},401);if(!sameOrigin(r))return json({error:'Ugyldig origin'},403);await db().batch([db().prepare('DELETE FROM rider_records WHERE user_id=?').bind(uid),db().prepare('DELETE FROM rider_profiles WHERE user_id=?').bind(uid)]);return json({deleted:true});}
export async function POST(r:Request){
 const uid=await userId(r);if(!uid)return json({error:'Log ind for at gemme privat'},401);if(!sameOrigin(r))return json({error:'Ugyldig origin'},403);
 try{const raw=await r.text();if(raw.length>150000)return json({error:'For mange data'},413);const body=JSON.parse(raw);
 if(body.action==='profile'){if(!validUser(body.profile)||!body.profile.consent)return json({error:'Ugyldig profil eller manglende samtykke'},400);await db().prepare('INSERT INTO rider_profiles (user_id,payload,updated_at) VALUES (?,?,?) ON CONFLICT(user_id) DO UPDATE SET payload=excluded.payload,updated_at=excluded.updated_at').bind(uid,JSON.stringify(body.profile),Date.now()).run();return json({saved:true});}
 const row=await db().prepare('SELECT payload FROM rider_profiles WHERE user_id=?').bind(uid).first<{payload:string}>();if(!row)return json({error:'Gem først en profil med samtykke'},400);const profile=JSON.parse(row.payload);if(!validUser(profile)||!profile.consent)return json({error:'Profilen er ugyldig'},400);
 if(body.action==='evaluation'){
 const spot=PLACES.find(s=>s.id===body.spotId),sport=[...SPORTS,...profile.customSports].find(s=>s.id===body.sportId);if(!spot||!sport)return json({error:'Ukendt sport eller spot'},400);
 const batch=await db().prepare('SELECT payload FROM intelligence_batches WHERE id=? AND spot_id=?').bind(body.batchId,spot.id).first<{payload:string}>();if(!batch)return json({error:'Forecast snapshot findes ikke'},400);
 const {snapshots,observations=[]}=JSON.parse(batch.payload);const wind=snapshots.filter((s:any)=>s.model===body.model),marine=snapshots.filter((s:any)=>s.model==='ecmwf_wam');if(!wind.length)return json({error:'Ukendt model'},400);
 const start=Date.parse(body.start),end=Date.parse(body.end);if(!Number.isFinite(start)||!Number.isFinite(end)||end<=start||end-start>12*3600000)return json({error:'Ugyldigt tidsrum'},400);
 const list=compareWindows({spot,sport,user:profile,hours:withMarine(wind,marine),allModels:snapshots,start:start-30*60000,end:end+20*60000,driveMinutes:0,maxDrive:0,durationMinutes:(end-start)/60000,spotRules:localRules(spot,sport),observations});
 const evaluation=list.find(e=>e.start===new Date(start).toISOString());if(!evaluation)return json({error:'Vinduet kunne ikke rekonstrueres'},400);
 await db().prepare('INSERT INTO rider_records (id,user_id,kind,payload,created_at) VALUES (?,?,?,?,?)').bind(evaluation.id,uid,'evaluation',JSON.stringify(evaluation),Date.now()).run();return json({saved:true,evaluation});
 }
 if(body.action==='session'){
 if(!validFeedback(body.feedback))return json({error:'Ugyldig sessionsfeedback'},400);
 const prior=await db().prepare("SELECT payload FROM rider_records WHERE id=? AND user_id=? AND kind='evaluation'").bind(body.evaluationId,uid).first<{payload:string}>();if(!prior)return json({error:'Gem først vurderingen'},400);
 const actualStart=Date.parse(body.actualStart),actualEnd=Date.parse(body.actualEnd);if(!Number.isFinite(actualStart)||!Number.isFinite(actualEnd)||actualEnd<=actualStart||actualEnd>Date.now())return json({error:'Sessionen skal være afsluttet, og sluttid skal være efter start'},400);
 const session={id:crypto.randomUUID(),schemaVersion:1,createdAt:new Date().toISOString(),actualStart:new Date(actualStart).toISOString(),actualEnd:new Date(actualEnd).toISOString(),evaluation:JSON.parse(prior.payload),feedback:body.feedback};
 await db().prepare('INSERT INTO rider_records (id,user_id,kind,payload,created_at) VALUES (?,?,?,?,?)').bind(session.id,uid,'session',JSON.stringify(session),Date.now()).run();return json({saved:true,session});
 }
 return json({error:'Ukendt handling'},400);
 }catch{return json({error:'Data kunne ikke gemmes. Prøv igen.'},503);}
}
