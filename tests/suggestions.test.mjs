import {test} from 'node:test';
import assert from 'node:assert/strict';
import {suggestForDay} from '../lib/intelligence/suggestions.ts';
import {compareWindows,equipped,hasEquipment} from '../lib/intelligence/engine.ts';
import {SPORTS,PLACES,EMPTY_USER,placesInRegion} from '../lib/intelligence/catalog.ts';
import {validUser} from '../lib/intelligence/validation.ts';
const spot=PLACES[0],sport=SPORTS.find(s=>s.id==='kite-freeride');
const user={...structuredClone(EMPTY_USER),sportIds:[sport.id]};
const now=Date.parse('2026-09-25T08:00:00Z');
const hour=(at,weather={})=>({id:at,schemaVersion:1,spotId:spot.id,provider:'Test',model:'ecmwf_ifs025',family:'ECMWF',modelRun:null,createdAt:null,retrievedAt:new Date(now).toISOString(),validTime:at,coordinates:{lat:spot.lat,lon:spot.lon},gridCoordinates:null,resolutionKm:25,weather:{wind:9,gust:11,direction:270,daylight:1,...weather},quality:{status:'unverified',notes:['Test only']}});
const snapshots=[hour('2026-09-25T08:00:00Z'),hour('2026-09-25T09:00:00Z')];
const bundle={snapshots,batchId:'test',warnings:[]};
test('minimal profile produces suggestions without gear, consent or travel',()=>{
 const before=structuredClone(user),rows=suggestForDay(spot,sport,user,bundle,'2026-09-25',now);
 assert.equal(rows.length,1);assert.equal(rows[0].start,'2026-09-25T08:00:00.000Z');assert.equal(rows[0].end,'2026-09-25T10:00:00.000Z');assert.deepEqual(user,before);assert.equal(rows[0].profile.equipment.length,0);assert.equal(rows[0].profile.consent,false);
});
test('equipment is an explicit filter and only selected disciplines are suggested',()=>{
 assert(equipped(sport,user));assert(!hasEquipment(sport,user));assert.equal(suggestForDay(spot,sport,{...user,equipmentOnly:true},bundle,'2026-09-25',now).length,0);
 const registered={...user,equipmentOnly:true,equipment:sport.equipmentKinds.map(kind=>({id:kind,kind,name:kind,size:null,sportIds:[]}))};
 assert.equal(suggestForDay(spot,sport,registered,bundle,'2026-09-25',now).length,1);
 assert.equal(suggestForDay(spot,sport,{...user,sportIds:[]},bundle,'2026-09-25',now).length,0);
});
test('quick suggestions retain hard weather, daylight, level and date restrictions',()=>{
 for(const weather of [{gust:90},{daylight:0},{wind:null}])assert.equal(suggestForDay(spot,sport,user,{...bundle,snapshots:[snapshots[0],hour(snapshots[1].validTime,weather)]},'2026-09-25',now).length,0);
 assert.equal(suggestForDay(spot,sport,user,bundle,'2026-09-26',now).length,0);
 const big=SPORTS.find(s=>s.id==='kite-big-air');assert.equal(suggestForDay(spot,big,{...user,sportIds:[big.id]},bundle,'2026-09-25',now).length,0);
 assert.equal(suggestForDay(spot,sport,user,bundle,'2026-09-25',now+3600000).length,0);
});
test('trip planning still includes travel and setup time',()=>{
 const args={spot,sport,user,hours:snapshots,allModels:snapshots,start:now,end:now+7200000,driveMinutes:0,maxDrive:0,durationMinutes:120};
 assert.equal(compareWindows(args).length,0);assert.equal(compareWindows({...args,includeTravel:false}).length,1);
});
test('profile compatibility and new area values are validated',()=>{
 assert(validUser(user));assert(validUser({...user,equipmentOnly:false,preferredRegion:'zealand'}));assert(!validUser({...user,equipmentOnly:'false'}));assert(!validUser({...user,preferredRegion:'unknown'}));
 const zealand=placesInRegion('zealand');for(const id of ['amager','lynaes','liseleje','tisvildeleje'])assert(zealand.some(p=>p.id===id));assert(!placesInRegion('thy').some(p=>p.id==='lynaes'));assert.equal(new Set(PLACES.map(p=>p.id)).size,PLACES.length);
});
