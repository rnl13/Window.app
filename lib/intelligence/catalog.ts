import {SPOTS} from '../kite-rules.ts';
import type {Sport,Spot,RuleSet,Range,Rule,User,Parameter} from './types.ts';
const created='2026-09-13T00:00:00Z';
export const PARAMETERS:Parameter[]=['wind','gust','direction','swell','swellDirection','period','secondarySwell','secondaryPeriod','windWave','windWaveDirection','windWavePeriod','tide','current','temperature','precipitation','daylight','stability','duration','gustRatio','waveEnergy','windSwellAngle','swellBreakAngle'];
export const range=(parameter:Parameter,min:number,idealMin:number,idealMax:number,max:number,weight=1,required=true):Range=>({parameter,min,idealMin,idealMax,max,weight,required});
export const ruleset=(id:string,ranges:Range[],rules:Rule[]=[],owner='system'):RuleSet=>({id,version:1,owner,source:owner==='system'?'Transparent pilot defaults; not validated safety thresholds':'User input',visibility:'private',evidence:owner==='system'?'seed':'user-derived',createdAt:created,updatedAt:created,ranges,rules});
const hard=(id:string,parameter:Parameter,min:number,max:number):Rule=>({id,name:`Hård grænse: ${parameter} ${min}–${max}`,when:[{parameter,op:'outside',min,max}],effect:'hard',points:0});
const offshore:Rule={id:'beginner-offshore',name:'Begynder og fralandsvind',when:[{parameter:'level',op:'is',value:'beginner'},{parameter:'relativeWind',op:'is',value:'offshore'}],effect:'hard',points:0};
const cross:Rule={...offshore,id:'beginner-cross',name:'Begynder og skrå fralandsvind',when:[{parameter:'level',op:'is',value:'beginner'},{parameter:'relativeWind',op:'is',value:'cross-offshore'}]};
function sport(id:string,name:string,discipline:string,equipmentKinds:string[],wind:number[],swell:number[]|null,period:number[]|null,extra:Rule[]=[],experienced=false):Sport{
 const ranges=[range('wind',wind[0],wind[1],wind[2],wind[3],2),...(swell?[range('swell',swell[0],swell[1],swell[2],swell[3],2)]:[]),...(period?[range('period',period[0],period[1],period[2],period[3])]:[])];
 return {id,name,discipline,equipmentKinds,minimumLevel:experienced?'experienced':'beginner',ruleset:ruleset(id,ranges,[hard('wind-limit','wind',0,wind[3]+4),hard('gust-limit','gust',0,wind[3]+10),offshore,cross,...extra])};
}
const clean:Rule={id:'clean-wave',name:'Let fralandsvind giver et positivt wave-match',when:[{parameter:'relativeWind',op:'is',value:'offshore'},{parameter:'wind',op:'between',min:0,max:5}],effect:'boost',points:8};
export const SPORTS:Sport[]=[
 sport('kite-wave','Kitesurf','Strapless Wave',['kite','kite-wave-board'],[4,8,12,20],[0.2,1.2,2,4],[3,9,14,20]),
 sport('kite-freeride','Kitesurf','Freeride',['kite','twintip'],[3,7,12,19],null,null),
 sport('kite-big-air','Kitesurf','Big Air',['kite','twintip'],[7,15,19,25],null,null,[],true),
 sport('kite-freestyle','Kitesurf','Freestyle',['kite','twintip'],[4,8,13,19],null,null),
 sport('kitefoil','Kitesurf','Kitefoil',['kite','kitefoil'],[2,4.5,7,13],null,null),
 sport('surf-short','Surf','Shortboard',['surfboard'],[0,0,4,10],[0.3,1.1,1.8,4],[4,10,14,22],[clean]),
 sport('surf-long','Surf','Longboard',['longboard'],[0,0,3,9],[0.15,0.5,1.2,2.5],[3,8,14,22],[clean]),
 sport('prone','Surf foil','Prone foil',['surf-foil'],[0,0,3,9],[0.15,0.5,0.9,2],[3,8,12,18],[clean]),
 sport('wing-wave','Wingfoil','Wave',['wing','wingfoil'],[3,8,12,19],[0.2,1,1.8,3.5],[3,7,12,18]),
 sport('wing-freeride','Wingfoil','Freeride',['wing','wingfoil'],[3,7,12,19],null,null),
 sport('wing-downwind','Wingfoil','Downwind',['wing','wingfoil'],[4,8,13,20],null,null),
 sport('windsurf-wave','Windsurf','Wave',['windsurf-rig','windsurf-board'],[5,11,16,23],[0.3,1.5,2.5,4],[3,8,13,20]),
 sport('windsurf-freeride','Windsurf','Freeride',['windsurf-rig','windsurf-board'],[3,8,14,22],null,null),
 sport('windsurf-foil','Windsurf','Slalom/foil',['windsurf-rig','windsurf-foil'],[2,5,10,18],null,null),
 sport('sup-wave','SUP','Wave',['sup','paddle'],[0,0,3,8],[0.2,0.6,1.2,2.5],[3,7,13,20],[clean]),
 sport('sup-touring','SUP','Touring',['sup','paddle'],[0,0,3,8],null,null),
 sport('sup-downwind','SUP','Downwind',['sup','paddle'],[3,7,11,17],null,null,[],true),
 sport('downwind-foil','Downwind foil','Downwind',['downwind-foil','paddle'],[3,8,12,19],null,null,[],true),
];
SPORTS.find(s=>s.id==='downwind-foil')!.ruleset.ranges.push(range('windWave',0.2,0.8,1.5,3,2),range('windWavePeriod',2,4,8,12));
const g=(sea:number|null,evidence:Spot['geometry']['evidence']='approximate'):Spot['geometry']=>({seaBearing:sea,coastlineOrientation:sea===null?null:(sea+90)%180,launchOrientation:sea,breakOrientation:sea,preferredWindSectors:[],preferredSwellSectors:[],dangerousSectors:[],hazards:[],localRules:[],evidence,bathymetry:null});
// Approximate seaward normals, NOT surveyed launch geometry. Agger convention reproduces the user's WNW/starboard and SE/port examples.
export const PLACES:Spot[]=[...SPOTS.map(s=>({id:s.id,name:s.id==='agger-tange'?'Høfde 72 · Agger Tange':s.name,lat:s.coordinates.lat,lon:s.coordinates.lon,geometry:{...g(({ 'agger-tange':270,hanstholm:337.5,'mon-fyr':90,'norre-vorupor':270} as Record<string,number>)[s.id]),hazards:[s.note],preferredWindSectors:s.windTargets.map(t=>({from:(t.bearing-t.width+360)%360,to:(t.bearing+t.width)%360})),preferredSwellSectors:s.waveTargets.map(t=>({from:(t.bearing-t.width+360)%360,to:(t.bearing+t.width)%360}))}})),{id:'klitmoller',name:'Klitmøller',lat:57.043,lon:8.488,geometry:g(270)},{id:'amager',name:'Amager Strandpark',lat:55.656,lon:12.647,geometry:g(90)}];
// Approximate area coordinate from https://lets-kite.com/en/spots/10271/kitesurf/middles.
// No verified break/launch geometry: classification and wave suitability remain unavailable.
PLACES.push({id:'middles',name:'Middles',lat:57.12,lon:8.64,geometry:{...g(null,'unknown'),hazards:['Omtrentlig placering i Hanstholm-området. Lokal launch- og brudgeometri er endnu ikke verificeret.']}});
// Beach reference points from the official destination pages' Find vej links.
// Seaward bearings are coarse coastline estimates, not verified launch or break geometry.
PLACES.push(
 {id:'lynaes',name:'Lynæs',lat:55.943993,lon:11.86268,sourceUrl:'https://www.visitdenmark.dk/danmark/explore/lynaes-strand-og-havbad-gdk619731',geometry:{...g(180),hazards:['Lavt vand. Kontroller dybde og lokale zoner før foil. Strandplaceringen er ikke en verificeret launchposition.']}},
 {id:'liseleje',name:'Liseleje',lat:56.013253,lon:11.968738,sourceUrl:'https://www.visitdenmark.dk/danmark/explore/liseleje-strand-gdk619693',geometry:{...g(330),hazards:['Badestrand. Kontroller skiltning og lokale launchzoner. Kystvinklen er omtrentlig.']}},
 {id:'tisvildeleje',name:'Tisvildeleje',lat:56.057984,lon:12.061572,sourceUrl:'https://www.visitdenmark.dk/danmark/explore/tisvildeleje-strand-gdk964060',geometry:{...g(315),hazards:['Badestrand. Lokale launchzoner og brudgeometri er ikke verificeret.']}}
);
export const REGIONS=[{id:'zealand',label:'Sjælland & Nordkysten'},{id:'thy',label:'Thy & Cold Hawaii'},{id:'all',label:'Alle spots · Danmark'}] as const;
export function placesInRegion(region:string){return PLACES.filter(p=>region==='all'||(region==='thy'?p.lon<9:p.lon>=11));}
export function localRules(spot:Spot,sport:Sport):RuleSet[]{
 if(spot.id==='agger-tange'&&sport.id==='kite-wave')return [ruleset('agger-user-calibration',[],[{id:'agger-combination',name:'S-swell + SØ-vind + lang periode matcher det personligt foretrukne setup',when:[{parameter:'direction',op:'sector',min:115,max:155},{parameter:'swellDirection',op:'sector',min:155,max:205},{parameter:'period',op:'between',min:9,max:20}],effect:'boost',points:10},{id:'agger-wnw',name:'VNV fra styrbord er mindre attraktivt til personlig wave riding',when:[{parameter:'direction',op:'sector',min:275,max:315}],effect:'penalty',points:25}],'user-calibration')];
 const legacy=SPOTS.find(s=>s.id===spot.id);
 if(legacy&&sport.id==='kite-wave')return [ruleset(`legacy-${spot.id}`,[],[{id:'outside-local-wind',name:'Vindretning uden for de lokale kitepræferencer',effect:'penalty',points:25,when:legacy.windTargets.map(t=>({parameter:'direction',op:'sector',min:(t.bearing+t.width)%360,max:(t.bearing-t.width+360)%360}))},...legacy.windTargets.map((t,i)=>({id:`legacy-wind-${i}`,name:`Lokal kitepræference: ${t.label}`,when:[{parameter:'direction' as const,op:'sector' as const,min:(t.bearing-t.width+360)%360,max:(t.bearing+t.width)%360}],effect:'boost' as const,points:i===0?8:3}))])];
 if(['surf-short','surf-long','prone'].includes(sport.id))return [ruleset(`break-${spot.id}`, [range('swellBreakAngle',0,0,55,120,1)])];
 return [];
}
export const EMPTY_USER:User={version:1,level:'intermediate',sportIds:[],customSports:[],equipment:[],preferences:[],consent:false};
export const EQUIPMENT_KINDS=[...new Set(SPORTS.flatMap(s=>s.equipmentKinds))];
