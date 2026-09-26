import {db,json} from '@/lib/calendar-db';
import {PLACES} from '@/lib/intelligence/catalog';
import {fetchModels,DmiObservationProvider} from '@/lib/intelligence/providers';
import {loadBundle} from '@/lib/intelligence/load-bundle';
export async function GET(request:Request){
 const spot=PLACES.find(s=>s.id===new URL(request.url).searchParams.get('spot'));if(!spot)return json({error:'Ukendt spot'},400);
 try{return json(await loadBundle({
 read:async()=>{const row=await db().prepare('SELECT id,payload FROM intelligence_batches WHERE spot_id=? AND retrieved_at>? ORDER BY retrieved_at DESC LIMIT 1').bind(spot.id,Date.now()-3600000).first<{id:string;payload:string}>();return row?{...JSON.parse(row.payload),batchId:row.id,stored:true,cached:true}:null;},
 forecast:()=>fetchModels(spot),observe:()=>new DmiObservationProvider().fetch(spot),
 write:async payload=>{const id=crypto.randomUUID();await db().prepare('INSERT INTO intelligence_batches (id,spot_id,retrieved_at,payload) VALUES (?,?,?,?)').bind(id,spot.id,Date.now(),JSON.stringify(payload)).run();
 // Observation archival must not invalidate an already saved forecast.
 try{if(payload.observations.length)await db().batch(payload.observations.map(o=>db().prepare('INSERT OR IGNORE INTO observation_records (id,spot_id,observed_at,payload) VALUES (?,?,?,?)').bind(o.id,spot.id,Date.parse(o.timestamp),JSON.stringify(o))));}catch(e){console.error('Window observation archive unavailable',e);}return id;},
 log:(stage,error)=>console.error('Window intelligence '+stage,error)
 }));}catch(error){console.error('Window forecast unavailable',error);return json({error:'Aktuelle prognoser kunne ikke hentes. Prøv igen om lidt.'},503);}
}
