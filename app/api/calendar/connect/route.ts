import {browserSessionRedirect} from '@/lib/auth-verification';
import {configured,db,go,json,runtime,userId} from '@/lib/calendar-db';
import {challenge,digest,GOOGLE_SCOPE,randomHex,REDIRECT_URI,sameOrigin,seal} from '@/lib/calendar-security';
export async function POST(r:Request){
 if(!sameOrigin(r))return json({error:'Ugyldig forespørgsel.'},403);
 const refresh=await browserSessionRedirect(r,runtime());if(refresh)return refresh;
 const user=await userId(r);if(!user)return go('/sign-in?return_to=%2Fcalendar');
 if(!configured())return go('/calendar?status=setup');
 try{
  const state=randomHex(),verifier=randomHex(),now=Date.now();
  await db().batch([
   db().prepare('DELETE FROM calendar_oauth WHERE user_id = ? OR expires_at < ?').bind(user,now),
   db().prepare('INSERT INTO calendar_oauth (state_hash,user_id,verifier,expires_at) VALUES (?,?,?,?)').bind(await digest(state),user,await seal(verifier,runtime().CALENDAR_TOKEN_KEY!,user),now+600000),
  ]);
  const params=new URLSearchParams({client_id:runtime().GOOGLE_CALENDAR_CLIENT_ID!,redirect_uri:REDIRECT_URI,response_type:'code',scope:GOOGLE_SCOPE,access_type:'offline',prompt:'consent',state,code_challenge:await challenge(verifier),code_challenge_method:'S256'});
  return go('https://accounts.google.com/o/oauth2/v2/auth?'+params);
 }catch{return go('/calendar?status=error');}
}
