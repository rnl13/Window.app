import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadBundle} from '../lib/intelligence/load-bundle.ts';
import {readProfile,restoreProfile} from '../lib/intelligence/profile-client.ts';
import {explainWindow} from '../lib/intelligence/explanations.ts';
import {suggestForDay} from '../lib/intelligence/suggestions.ts';
import {EMPTY_USER,PLACES,SPORTS} from '../lib/intelligence/catalog.ts';
const profile={...structuredClone(EMPTY_USER),sportIds:['kite-freeride'],consent:true};
const snapshots=[8,9].map((h,i)=>({id:String(h),spotId:PLACES[0].id,provider:'Test',model:'ecmwf_ifs025',family:'ECMWF',validTime:`2026-09-25T0${h}:00:00Z`,retrievedAt:'2026-09-25T07:00:00Z',modelRun:null,weather:{wind:i?13:9,gust:15,direction:270,daylight:1}}));
const deps=()=>({read:async()=>null,forecast:async()=>({snapshots,warnings:[]}),observe:async()=>[],write:async()=> 'saved',log:()=>{}});
test('forecast survives cache read and write failures, but does not pretend persistence',async()=>{
 const d=deps();d.read=async()=>{throw Error('DB down');};d.write=d.read;
 const b=await loadBundle(d);assert.equal(b.snapshots.length,2);assert.equal(b.stored,false);assert.equal(b.batchId,null);assert(b.warnings.length);
});
test('optional observations cannot block forecasts; no wind is a real failure',async()=>{
 const d=deps();d.observe=async()=>{throw Error('station down');};assert.equal((await loadBundle(d)).stored,true);
 d.forecast=async()=>({snapshots:[],warnings:['timeout']});await assert.rejects(loadBundle(d),/Ingen vindprognoser/);
});
test('fresh cache avoids another provider call',async()=>{
 const d=deps();d.read=async()=>({snapshots,stored:true,batchId:'cached'});d.forecast=async()=>{throw Error('must not call');};assert.equal((await loadBundle(d)).batchId,'cached');
});
test('profile distinguishes signed out, failed storage and a saved minimal profile',async()=>{
 assert.equal((await readProfile(async()=>new Response('',{status:401}))).authenticated,false);
 await assert.rejects(readProfile(async()=>new Response('',{status:503})),/Genindlæs/);
 assert.deepEqual((await readProfile(async()=>Response.json({profile,records:[]}))).profile,profile);
 assert.deepEqual(restoreProfile('{broken',profile),profile);assert.deepEqual(restoreProfile(JSON.stringify(profile),null),profile);
});
test('explanation covers every hour, not just the first favourable hour',()=>{
 const window=suggestForDay(PLACES[0],SPORTS.find(s=>s.id==='kite-freeride'),profile,{snapshots},'2026-09-25',Date.parse('2026-09-25T07:00:00Z'))[0];
 const e=explainWindow(window,snapshots);assert.match(e.conditions[0],/9–13/);assert.match(e.conditions[0],/Ikke hele tiden/);assert.match(e.direction,/pålandsvind/);
});
