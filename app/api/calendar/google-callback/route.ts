import {browserSessionRedirect} from '@/lib/auth-verification';
import {configured,db,go,runtime,userId} from '@/lib/calendar-db';
import {digest,GOOGLE_SCOPE,REDIRECT_URI,seal,unseal} from '@/lib/calendar-security';
import {google,tokenRequest} from '@/lib/calendar-google';
export async function GET(r:Request){
 const refresh=await browserSessionRedirect(r,runtime());if(refresh)return refresh;
 const user=await userId(r),url=new URL(r.url),state=url.searchParams.get('state');
 if(!configured()||!user||!state||!/^[a-f0-9]{64}$/.test(state))return go('/calendar?status=error');
 let locked=false;
 try{
  const saved=await db().prepare('DELETE FROM calendar_oauth WHERE state_hash = ? AND user_id = ? AND expires_at > ? RETURNING verifier').bind(await digest(state),user,Date.now()).first<{verifier:string}>();
  if(!saved)return go('/calendar?status=expired');
  if(url.searchParams.has('error'))return go('/calendar?status=cancelled');
  const code=url.searchParams.get('code');if(!code)return go('/calendar?status=error');
  // Reserve one connection row before external calls, avoiding concurrent calendar creation.
  await db().prepare('INSERT OR IGNORE INTO calendar_connections (user_id,refresh_token,calendar_id,lease_until,updated_at) VALUES (?,NULL,NULL,0,?)').bind(user,Date.now()).run();
  const conn=await db().prepare('UPDATE calendar_connections SET lease_until = ? WHERE user_id = ? AND lease_until < ? RETURNING calendar_id').bind(Date.now()+120000,user,Date.now()).first<{calendar_id:string|null}>();
  if(!conn)return go('/calendar?status=busy');locked=true;
  const e=runtime(),tokens=await tokenRequest({code,client_id:e.GOOGLE_CALENDAR_CLIENT_ID!,client_secret:e.GOOGLE_CALENDAR_CLIENT_SECRET!,redirect_uri:REDIRECT_URI,grant_type:'authorization_code',code_verifier:await unseal(saved.verifier,e.CALENDAR_TOKEN_KEY!,user)});
  if(!String(tokens.scope??'').split(' ').includes(GOOGLE_SCOPE)||typeof tokens.refresh_token!=='string')return go('/calendar?status=scope');
  let calendarId=conn.calendar_id;
  if(calendarId){try{await google('calendars/'+encodeURIComponent(calendarId),tokens.access_token);}catch{return go('/calendar?status=account');}}
  else{const calendar=await google('calendars',tokens.access_token,'POST',{summary:'Window',description:'Dine foreløbige ture fra Window',timeZone:'Europe/Copenhagen'});if(typeof calendar.id!=='string')throw new Error('Invalid calendar');calendarId=calendar.id;}
  await db().prepare('UPDATE calendar_connections SET refresh_token = ?, calendar_id = ?, updated_at = ? WHERE user_id = ?').bind(await seal(tokens.refresh_token,e.CALENDAR_TOKEN_KEY!,user),calendarId,Date.now(),user).run();
  return go('/calendar?status=connected');
 }catch{return go('/calendar?status=error');}
 finally{if(locked)await db().prepare('UPDATE calendar_connections SET lease_until = 0 WHERE user_id = ?').bind(user).run().catch(()=>{});}
}
