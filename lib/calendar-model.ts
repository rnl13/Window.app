import {calendarLink} from './window-calendar.ts';
export type CalendarPlan={id:string;date:string;name:string;region:string;lat:number;lon:number;departure:number;home:number;waterStart:number;waterEnd:number;reminders:number[];cancelled:boolean};
export function parsePlan(value:unknown):CalendarPlan|null{
 const p=value as CalendarPlan;
 if(!p||typeof p!=='object'||typeof p.id!=='string'||!/^([a-f0-9]{8}-)([a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(p.id))return null;
 if(typeof p.name!=='string'||!p.name.trim()||p.name.length>120||typeof p.region!=='string'||p.region.length>200||typeof p.date!=='string')return null;
 if(!Array.isArray(p.reminders)||p.reminders.length>2||p.reminders.some(m=>![15,30,60,120,1440].includes(m))||typeof p.cancelled!=='boolean')return null;
 if(!calendarLink(p))return null;
 return {id:p.id.toLowerCase(),date:p.date,name:p.name.trim(),region:p.region,lat:p.lat,lon:p.lon,departure:p.departure,home:p.home,waterStart:p.waterStart,waterEnd:p.waterEnd,reminders:[...new Set(p.reminders)],cancelled:p.cancelled};
}
const clock=(m:number)=>`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}:00`;
export function eventBody(p:CalendarPlan){return {
 id:p.id.replaceAll('-',''),summary:`Window · ${p.name} (foreløbig tur)`,
 start:{dateTime:`${p.date}T${clock(p.departure)}`,timeZone:'Europe/Copenhagen'},
 end:{dateTime:`${p.date}T${clock(p.home)}`,timeZone:'Europe/Copenhagen'},
 location:`${p.name} · ${p.region} · ${p.lat}, ${p.lon}`,
 description:`Foreløbig tur fra Window-demoen. Vejrdata er ikke en aktuel prognose for stedet.\nVandtid: ${clock(p.waterStart).slice(0,5)}–${clock(p.waterEnd).slice(0,5)} (dansk tid).\nTransport, klargøring og hjemtur er medregnet. Kontrollér vejr og lokal adgang før afgang.\nÆndringer gemt i Window opdaterer denne aftale. Der er endnu ingen automatisk vejrovervågning.`,
 status:p.cancelled?'cancelled':'tentative',visibility:'private',
 reminders:{useDefault:false,overrides:p.reminders.map(minutes=>({method:'popup',minutes}))},
 extendedProperties:{private:{windowPlanId:p.id}},
};}
