import {configured,db,json,runtime,userId} from '@/lib/calendar-db';
import {sameOrigin,unseal} from '@/lib/calendar-security';
import {parsePlan} from '@/lib/calendar-model';
import {errorMessage,GoogleError,syncGoogleEvent,tokenRequest} from '@/lib/calendar-google';
export async function GET(r:Request){
 const user=await userId(r);if(!user)return json({error:'Log ind for at se dine ture.'},401);
 try{const rows=await db().prepare('SELECT id,payload,revision,sync_status,error_code,updated_at FROM calendar_plans WHERE user_id = ? ORDER BY updated_at DESC LIMIT 100').bind(user).all();return json({plans:rows.results.map((r:any)=>({plan:JSON.parse(r.payload),revision:r.revision,status:r.sync_status,error:r.error_code?errorMessage(r.error_code):null}))});}
 catch{return json({error:'Dine ture kunne ikke hentes.'},503);}
}
export async function POST(r:Request){
 if(!sameOrigin(r)||!r.headers.get('content-type')?.startsWith('application/json'))return json({error:'Ugyldig forespørgsel.'},403);
 const user=await userId(r);if(!user)return json({error:'Log ind for at gemme turen.'},401);
 if(!configured())return json({error:'Google Calendar er endnu ikke aktiveret for Window.'},503);
 let body:any;try{const raw=await r.text();if(raw.length>12000)return json({error:'Turen er for stor.'},400);body=JSON.parse(raw);}catch{return json({error:'Ugyldig tur.'},400);}
 const plan=parsePlan(body.plan);if(!plan||!Number.isInteger(body.revision)||body.revision<0)return json({error:'Kontrollér sted, dato, tider og påmindelser.'},400);
 let locked=false,revision=0,saved=false;
 try{
  const now=Date.now();
  const conn=await db().prepare('UPDATE calendar_connections SET lease_until = ? WHERE user_id = ? AND lease_until < ? AND refresh_token IS NOT NULL RETURNING refresh_token,calendar_id').bind(now+120000,user,now).first<{refresh_token:string;calendar_id:string}>();
  if(!conn)return json({error:'Forbind Google Calendar, eller vent på den igangværende synkronisering.'},409);locked=true;
  const old=await db().prepare('SELECT revision FROM calendar_plans WHERE id = ? AND user_id = ?').bind(plan.id,user).first<{revision:number}>();
  if(old&&old.revision!==body.revision||!old&&body.revision!==0)return json({error:'Turen er ændret et andet sted. Hent den igen før du gemmer.'},409);
  revision=(old?.revision??0)+1;
  if(old)await db().prepare('UPDATE calendar_plans SET payload = ?, revision = ?, sync_status = ?, error_code = NULL, updated_at = ? WHERE id = ? AND user_id = ?').bind(JSON.stringify(plan),revision,'pending',now,plan.id,user).run();
  else{
   const count=await db().prepare('SELECT COUNT(*) AS n FROM calendar_plans WHERE user_id = ?').bind(user).first<{n:number}>();
   if((count?.n??0)>=100)return json({error:'Du har nået grænsen på 100 gemte ture.'},409);
   await db().prepare('INSERT INTO calendar_plans (id,user_id,payload,revision,sync_status,updated_at) VALUES (?,?,?,?,?,?)').bind(plan.id,user,JSON.stringify(plan),revision,'pending',now).run();
  }
  saved=true;
  const e=runtime(),tokens=await tokenRequest({client_id:e.GOOGLE_CALENDAR_CLIENT_ID!,client_secret:e.GOOGLE_CALENDAR_CLIENT_SECRET!,grant_type:'refresh_token',refresh_token:await unseal(conn.refresh_token,e.CALENDAR_TOKEN_KEY!,user)});
  const event=await syncGoogleEvent(conn.calendar_id,tokens.access_token,plan);
  await db().prepare('UPDATE calendar_plans SET sync_status = ?, error_code = NULL, google_url = ?, updated_at = ? WHERE id = ? AND user_id = ? AND revision = ?').bind('synced',typeof event.htmlLink==='string'?event.htmlLink:null,Date.now(),plan.id,user,revision).run();
  return json({plan,revision,status:'synced'});
 }catch(e){
  const code=e instanceof GoogleError?e.code:'GOOGLE_UNAVAILABLE';
  if(saved){await db().prepare('UPDATE calendar_plans SET sync_status = ?, error_code = ? WHERE id = ? AND user_id = ? AND revision = ?').bind('error',code,plan.id,user,revision).run().catch(()=>{});return json({plan,revision,status:'error',error:errorMessage(code)},502);}
  return json({error:'Turen kunne ikke gemmes. Prøv igen.'},503);
 }finally{if(locked)await db().prepare('UPDATE calendar_connections SET lease_until = 0 WHERE user_id = ?').bind(user).run().catch(()=>{});}
}
