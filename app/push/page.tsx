'use client';
import {authFetch} from '@/lib/auth-fetch';
import {useEffect,useState} from 'react';
import {SPOTS} from '@/lib/kite-rules';
import {Button} from '@/components/ui/button';
export default function PushPage(){
 const [status,setStatus]=useState<any>(null),[message,setMessage]=useState(''),[busy,setBusy]=useState(false),[sub,setSub]=useState<PushSubscription|null>(null),[spots,setSpots]=useState<string[]>([SPOTS[0].id]),[threshold,setThreshold]=useState(80);
 useEffect(()=>{authFetch('/api/push').then(r=>r.json()).then(setStatus).catch(()=>setMessage('Status kunne ikke hentes. Genindlæs siden.'));if('serviceWorker'in navigator)navigator.serviceWorker.getRegistration('/').then(r=>r?.pushManager.getSubscription()).then(async s=>{setSub(s??null);if(s){const r=await authFetch('/api/push',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'read',subscription:s.toJSON()})});if(r.ok){const b:any=await r.json();setSpots(b.spots);setThreshold(b.threshold);}}}).catch(()=>{});},[]);
 const api=async(action:string,s:PushSubscription)=>{const r=await authFetch('/api/push',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,subscription:s.toJSON(),spots,threshold})});const b:any=await r.json();if(!r.ok)throw Error(b.error||'Handlingen mislykkedes.');return b;};
 const run=async(action:string)=>{setBusy(true);setMessage('');try{
 if(action==='subscribe'){
 if(!('serviceWorker'in navigator)||!('PushManager'in window)||!('Notification'in window))throw Error('Åbn Window i Safari, føj den til hjemmeskærmen, og åbn den derfra. Din browser skal understøtte web-push.');
 const granted=await Notification.requestPermission();if(granted!=='granted')throw Error('Notifikationer blev ikke tilladt. Kontrollér tilladelsen i telefonens indstillinger.');
 const reg=await navigator.serviceWorker.register('/sw.js',{scope:'/'});await navigator.serviceWorker.ready;
 const key=Uint8Array.from(atob(status.publicKey.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));
 const existing=await reg.pushManager.getSubscription();const s=existing??await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key});setSub(s);await api('subscribe',s);setMessage('Spotvalg er gemt. Send en testbesked nedenfor. Automatisk vindovervågning følger status ovenfor.');
 }else if(sub&&action==='test'){const b=await api('test',sub);setMessage(b.message);}
 else if(sub&&action==='remove'){await api('remove',sub);await sub.unsubscribe();setSub(null);setMessage('Push er slået fra på denne enhed.');}
 }catch(e){setMessage(e instanceof Error?e.message:'Handlingen mislykkedes.');}finally{setBusy(false);}};
 return <main className="min-h-screen bg-[#042934] px-5 py-7 text-white"><div className="mx-auto max-w-xl space-y-5"><a href="/" className="text-cyan-200 underline">← Window</a><h1 className="text-3xl font-semibold">Vindbeskeder på telefonen</h1><p>Få besked om gode vejrmatch ved dine valgte spots. Google Calendar er ikke nødvendig.</p>
 <div className="rounded-xl border border-cyan-200/30 p-4"><p className="font-semibold">{!status?'Henter status…':status.schedulerActive?'Automatisk vejrtjek er aktivt':'Automatisk vejrtjek afventer aktivering'}</p><p className="mt-2 text-sm">{status?.schedulerActive?'Serveren har gennemført et vejrtjek inden for de seneste 90 minutter.':'Du kan tilmelde enheden og teste push. Der sendes endnu ikke automatiske vindvarsler, mens Window er lukket.'}</p></div>
 <p className="text-sm text-cyan-100">På iPhone: Åbn Window i Safari → Del → Føj til hjemmeskærm. Åbn derefter Window fra det nye ikon og tillad notifikationer.</p>
 {status&&!status.authenticated?<a href="/sign-in?return_to=%2Fpush" target="_top" className="inline-block rounded-xl bg-cyan-200 px-5 py-3 font-semibold text-slate-950">Log ind for at gemme dine valg</a>:status&&!status.configured?<p>Pushforbindelsen afventer opsætning.</p>:status&&<>
 <fieldset className="space-y-2"><legend className="mb-2 font-semibold">Dine spots</legend>{SPOTS.map(s=><label key={s.id} className="flex min-h-11 items-center gap-3"><input type="checkbox" className="h-5 w-5" checked={spots.includes(s.id)} onChange={e=>setSpots(e.target.checked?[...spots,s.id]:spots.filter(x=>x!==s.id))}/>{s.name}</label>)}</fieldset>
 <label className="block">Minimumsscore: {threshold}/100<input aria-label="Minimumsscore" className="mt-3 block w-full accent-cyan-200" type="range" min="55" max="90" value={threshold} onChange={e=>setThreshold(Number(e.target.value))}/></label>
 <p className="text-sm text-cyan-100">Når overvågningen aktiveres: højst én vindbesked om dagen pr. enhed, om forhold i dagslys inden for 24 timer. Scoren er et vejrmatch, ikke en sikkerhedsvurdering.</p>
 <div className="flex flex-wrap gap-3"><Button disabled={busy||!spots.length} onClick={()=>void run('subscribe')}>Tillad push og gem valg</Button>{sub&&<><Button disabled={busy} onClick={()=>void run('test')}>Send testbesked</Button><Button disabled={busy} onClick={()=>void run('remove')}>Slå push fra</Button></>}</div></>}
 {message&&<p role="status" className="rounded-xl border border-white/20 p-4">{message}</p>}
 <p className="text-sm text-cyan-100">Dine valg og enhedens pushabonnement gemmes på din Window-konto. Pushbeskeder kan forsinkes eller skjules af telefonens Fokus-indstillinger. Testen er først bekræftet, når du ser beskeden.</p>
 </div></main>;
}
