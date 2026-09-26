'use client';
import {authFetch} from '@/lib/auth-fetch';
import {useEffect,useState} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {parsePlan,type CalendarPlan} from '@/lib/calendar-model';
type RecordRow={plan:CalendarPlan;revision:number;status:string;error?:string|null};
type Draft=Omit<CalendarPlan,'id'|'reminders'|'cancelled'>;
const EMPTY_KEY='window-calendar-draft-v1';
const clock=(n:number)=>`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
const mins=(s:string)=>/^\d{2}:\d{2}$/.test(s)?Number(s.slice(0,2))*60+Number(s.slice(3)):NaN;
export default function CalendarPanel({draft,manage=false}:{draft?:Draft|null;manage?:boolean}){
 const [connection,setConnection]=useState<{configured:boolean;authenticated:boolean;connected:boolean}|null>(null);
 const [rows,setRows]=useState<RecordRow[]>([]),[record,setRecord]=useState<RecordRow|null>(null),[id,setId]=useState('');
 const [hour,setHour]=useState(true),[day,setDay]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const [revision,setRevision]=useState(0),[confirmDisconnect,setConfirmDisconnect]=useState(false);
 const refresh=async()=>{try{const r=await authFetch('/api/calendar/status');const d:any=await r.json();if(!r.ok)throw new Error(d.error);setConnection(d);if(d.authenticated&&d.configured){const res=await authFetch('/api/calendar/plans');const data:any=await res.json();if(!res.ok)throw new Error(data.error);setRows(data.plans??[]);}}catch(e){setMessage(e instanceof Error?e.message:'Kalenderen kunne ikke hentes.');}};
 useEffect(()=>{setId(crypto.randomUUID());void refresh();if(manage){try{const saved=JSON.parse(sessionStorage.getItem(EMPTY_KEY)??'null');const plan=parsePlan(saved?.plan);if(plan&&Number.isInteger(saved.revision)){setRecord({plan,revision:saved.revision,status:'draft'});sessionStorage.removeItem(EMPTY_KEY);}}catch{}}},[]);
 const plan:CalendarPlan|null=manage?record?.plan??null:draft&&id?{...draft,id,reminders:[...(hour?[60]:[]),...(day?[1440]:[])],cancelled:false}:null;
 const currentRevision=manage?record?.revision??0:revision;
 const remember=()=>{if(plan)try{sessionStorage.setItem(EMPTY_KEY,JSON.stringify({plan,revision:currentRevision}));}catch{}};
 const save=async(p=plan,rev=currentRevision)=>{
  if(!p||!parsePlan(p)){setMessage('Kontrollér dato og tider. Afgang, vandtid og hjemkomst skal ligge i den rækkefølge.');return;}
  setBusy(true);setMessage('');
  try{const r=await authFetch('/api/calendar/plans',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({plan:p,revision:rev})});const data:any=await r.json();
   if(data.plan&&Number.isInteger(data.revision)){setRevision(data.revision);if(manage)setRecord({plan:data.plan,revision:data.revision,status:data.status,error:data.error});}
   setMessage(r.ok?(p.cancelled?'Turen er aflyst i Google Calendar.':'Turen er synkroniseret til Google Calendar.'):data.error||'Kunne ikke synkronisere.');await refresh();
  }catch{setMessage('Forbindelsen blev afbrudt. Hent dine ture igen, før du prøver at gemme på ny.');}finally{setBusy(false);}
 };
 const disconnect=async()=>{setBusy(true);try{const r=await authFetch('/api/calendar/disconnect',{method:'POST'});const d:any=await r.json();setMessage(d.message||d.error);setConfirmDisconnect(false);await refresh();}catch{setMessage('Forbindelsen kunne ikke afbrydes.');}finally{setBusy(false);}};
 const edit=(changes:Partial<CalendarPlan>)=>{if(record)setRecord({...record,plan:{...record.plan,...changes}});};
 const input='mt-1 h-11 min-w-0 border-slate-300 bg-white text-base text-slate-950';
 return <section className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-950 sm:p-6">
  <h2 className="text-xl font-semibold">Automatisk kalender</h2>
  {!connection&&!message&&<p className="mt-3">Henter kalenderstatus…</p>}
  {connection&&!connection.configured&&<><p className="mt-3 font-medium">Afventer aktivering</p><p className="mt-2 text-base text-slate-600">Window er endnu ikke forbundet til Google Calendar. Brug den almindelige kalenderknap indtil forbindelsen er klar.</p></>}
  {connection?.configured&&!connection.authenticated&&<><p className="mt-3">Log ind for at holde dine ture adskilt fra andres. Derefter forbinder du Google Calendar.</p><a href="/sign-in?return_to=%2Fcalendar" target="_top" onClick={remember} className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-[#052a38] px-4 py-2 text-white">Log ind / opret konto</a></>}
  {connection?.configured&&connection.authenticated&&!connection.connected&&<><p className="mt-3">Forbind Google for at gemme og opdatere dine ture i en særskilt Window-kalender. Window får adgang til kalendere, som appen selv opretter.</p><form action="/api/calendar/connect" method="post" target="_top" onSubmit={remember}><Button className="mt-4 bg-[#052a38] text-white">Forbind Google Calendar</Button></form></>}
  {connection?.connected&&<>
   <p className="mt-3 font-medium">Google Calendar er forbundet</p>
   {plan&&!plan.cancelled&&<div className="mt-4 space-y-4">
    {manage&&<div className="grid grid-cols-2 gap-3"><label className="col-span-2 text-sm">Lokation<Input value={plan.name} readOnly className={input}/></label><label className="col-span-2 text-sm">Dato<Input type="date" value={plan.date} onChange={e=>edit({date:e.target.value})} className={input}/></label>{([{key:'departure',label:'Afgang'},{key:'home',label:'Hjemme'},{key:'waterStart',label:'På vandet fra'},{key:'waterEnd',label:'På vandet til'}] as const).map(f=><label key={f.key} className="min-w-0 text-sm">{f.label}<Input type="time" value={Number.isFinite(plan[f.key])?clock(plan[f.key]):''} onChange={e=>edit({[f.key]:mins(e.target.value)})} className={input}/></label>)}</div>}
    <p className="text-sm text-slate-600">Påmindelse før afgang</p><div className="flex flex-wrap gap-4">{[{value:60,label:'1 time før'},{value:1440,label:'Dagen før'}].map(o=><label key={o.value} className="flex min-h-11 items-center gap-2"><input type="checkbox" className="h-5 w-5" checked={plan.reminders.includes(o.value)} onChange={e=>manage?edit({reminders:e.target.checked?[...plan.reminders,o.value]:plan.reminders.filter(n=>n!==o.value)}):o.value===60?setHour(e.target.checked):setDay(e.target.checked)}/>{o.label}</label>)}</div>
    <p className="text-sm text-slate-600">Planlagt tur baseret på det valgte tidsrum. Gem ændringer her for at opdatere den samme aftale. Påmindelser leveres af Google Calendar og kræver tilladelse på din telefon.</p>
    <Button disabled={busy} className="min-h-12 w-full bg-[#052a38] text-white" onClick={()=>void save()}>{busy?'Synkroniserer…':currentRevision?'Gem ændringer og synkroniser':'Gem tur i Google Calendar'}</Button>
    {!manage&&revision>0&&<button disabled={busy} className="min-h-11 text-sm underline" onClick={()=>{setId(crypto.randomUUID());setRevision(0);setMessage('Klar til en ny tur. Den tidligere tur kan redigeres under Mine ture.');}}>Opret som en ny tur</button>}
   </div>}
   {!plan&&<p className="mt-3 text-slate-600">Vælg sted og dato i turplanlæggeren for at gemme en ny tur.</p>}
   <p className="mt-4 text-sm text-slate-600">Der er endnu ingen automatisk vejrovervågning eller læsning af din ledige tid.</p>
   {confirmDisconnect?<div className="mt-4 rounded-lg bg-slate-100 p-3"><p>Stop synkroniseringen? Eksisterende kalenderaftaler og gemte ture bliver bevaret.</p><div className="mt-3 flex gap-2"><Button disabled={busy} variant="outline" onClick={()=>setConfirmDisconnect(false)}>Behold</Button><Button disabled={busy} variant="destructive" onClick={()=>void disconnect()}>Afbryd forbindelsen</Button></div></div>:<button disabled={busy} className="mt-3 min-h-11 text-sm underline" onClick={()=>setConfirmDisconnect(true)}>Afbryd Google-forbindelsen</button>}
  </>}
  {message&&<p role="status" className="mt-4 rounded-lg bg-slate-100 p-3">{message}</p>}
  {manage&&rows.length>0&&<div className="mt-6 border-t border-slate-200 pt-5"><h3 className="text-lg font-semibold">Mine ture</h3><ul className="mt-3 divide-y divide-slate-200">{rows.map(row=><li key={row.plan.id} className="py-4"><p className="font-semibold">{row.plan.name} · {row.plan.date}</p><p className="mt-1 text-sm">{clock(row.plan.departure)}–{clock(row.plan.home)} · {row.plan.cancelled?(row.status==='synced'?'Aflyst':'Afventer aflysning'):row.status==='synced'?'Synkroniseret':row.status==='pending'?'Afventer synkronisering':'Synkronisering fejlede'}</p>{row.error&&<p className="mt-2 text-sm text-amber-900">{row.error}</p>}<div className="mt-3 flex flex-wrap gap-3">{!row.plan.cancelled&&<Button disabled={busy} variant="outline" onClick={()=>{setRecord(row);setMessage('Turen er valgt til redigering ovenfor.');}}>Rediger</Button>}{row.status!=='synced'&&<Button disabled={busy||!connection?.connected} variant="outline" onClick={()=>void save(row.plan,row.revision)}>Prøv synkronisering igen</Button>}{!row.plan.cancelled&&<details><summary className="cursor-pointer py-2 text-sm underline">Aflys tur</summary><p className="my-2 text-sm">Aftalen fjernes fra Google Calendar. Gemte turdata bevares i Window.</p><Button disabled={busy||!connection?.connected} variant="destructive" onClick={()=>void save({...row.plan,cancelled:true},row.revision)}>Bekræft aflysning</Button></details>}</div></li>)}</ul></div>}
  <div className="mt-4 flex flex-wrap gap-4 text-sm"><a href={manage?'/decision-lab':'/calendar'} onClick={manage?undefined:remember} className="min-h-11 py-2 underline">{manage?'Til turplanlæggeren':'Mine ture og kalenderforbindelse'}</a><button className="min-h-11 py-2 underline" disabled={busy} onClick={()=>void refresh()}>Hent status igen</button></div>
 </section>;
}
