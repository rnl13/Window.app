import {configured,db,json,userId} from '@/lib/calendar-db';
export async function GET(r:Request){
 const user=await userId(r);if(!configured())return json({configured:false,authenticated:!!user,connected:false});
 if(!user)return json({configured:true,authenticated:false,connected:false});
 try{const row=await db().prepare('SELECT refresh_token FROM calendar_connections WHERE user_id = ?').bind(user).first<{refresh_token:string|null}>();return json({configured:true,authenticated:true,connected:!!row?.refresh_token});}
 catch{return json({error:'Kalenderstatus kunne ikke hentes.'},503);}
}
