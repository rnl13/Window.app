import {db,json,runtime,userId} from '@/lib/calendar-db';
import {sameOrigin,unseal} from '@/lib/calendar-security';
export async function POST(r:Request){
 if(!sameOrigin(r))return json({error:'Ugyldig forespørgsel.'},403);
 const user=await userId(r);if(!user)return json({error:'Log ind først.'},401);
 let locked=false;
 try{
  const row=await db().prepare('UPDATE calendar_connections SET lease_until = ? WHERE user_id = ? AND lease_until < ? RETURNING refresh_token').bind(Date.now()+120000,user,Date.now()).first<{refresh_token:string|null}>();
  if(!row)return json({error:'Ingen forbindelse, eller synkronisering er i gang. Prøv igen.'},409);locked=true;
  let revoked=!row.refresh_token;
  if(row.refresh_token){try{const token=await unseal(row.refresh_token,runtime().CALENDAR_TOKEN_KEY!,user);const response=await fetch('https://oauth2.googleapis.com/revoke',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({token}),signal:AbortSignal.timeout(12000)});revoked=response.ok;}catch{}}
  await db().batch([db().prepare('UPDATE calendar_connections SET refresh_token = NULL, updated_at = ? WHERE user_id = ?').bind(Date.now(),user),db().prepare('DELETE FROM calendar_oauth WHERE user_id = ?').bind(user)]);
  return json({disconnected:true,revoked,message:revoked?'Forbindelsen er afbrudt. Eksisterende aftaler bliver i Google Calendar.':'Window har slettet sin adgang. Fjern også Window i Google-kontoens forbindelser, da Google ikke bekræftede tilbagekaldelsen.'});
 }catch{return json({error:'Forbindelsen kunne ikke afbrydes. Prøv igen.'},503);}
 finally{if(locked)await db().prepare('UPDATE calendar_connections SET lease_until = 0 WHERE user_id = ?').bind(user).run().catch(()=>{});}
}
