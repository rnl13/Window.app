import {SITE_ORIGIN} from './site-config.ts';
type Plan = {date:string;departure:number;home:number;waterStart:number;waterEnd:number;name:string;region:string;lat:number;lon:number};
const clock=(m:number)=>`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;

// Google receives local wall times with an explicit time zone, not the browser's zone.
export function calendarLink(p:Plan):string|null {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(p.date))return null;
 const parsed=new Date(`${p.date}T12:00:00Z`);
 if(!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==p.date)return null;
 if(!p.name.trim()||!Number.isFinite(p.lat)||Math.abs(p.lat)>90||!Number.isFinite(p.lon)||Math.abs(p.lon)>180)return null;
 if([p.departure,p.home,p.waterStart,p.waterEnd].some(m=>!Number.isInteger(m)||m<0||m>=1440))return null;
 if(!(p.departure<=p.waterStart&&p.waterStart<p.waterEnd&&p.waterEnd<=p.home))return null;
 const stamp=(m:number)=>`${p.date.replaceAll('-','')}T${clock(m).replace(':','')}00`;
 const params=new URLSearchParams({
  action:'TEMPLATE',
  text:`Window · ${p.name} (foreløbig tur)`,
  dates:`${stamp(p.departure)}/${stamp(p.home)}`,
  ctz:'Europe/Copenhagen',
  location:[p.name,p.region,`${p.lat}, ${p.lon}`].filter(Boolean).join(' · '),
  details:[
   'Foreløbig plan oprettet fra Window-demoen. Vejr og score er demodata, ikke en prognose for stedet eller datoen.',
   `Afgang: ${clock(p.departure)}. Vandtid: ${clock(p.waterStart)}–${clock(p.waterEnd)}. Hjemme: ${clock(p.home)}. Alle tider er dansk tid.`,
   'Køretiden er selv angivet. Lokationen er et områdepunkt, ikke en kontrolleret launch.',
   'Kontrollér faktisk vejr og spot før turen. Vælg din kalenderpåmindelse før du gemmer, fx 1 time før afgang.',
   'Window opdaterer ikke denne aftale og overvåger ikke vejret i baggrunden.',
   SITE_ORIGIN+'/decision-lab',
  ].join('\n\n'),
 });
 return `https://calendar.google.com/calendar/render?${params}`;
}
