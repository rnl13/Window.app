'use client';
import {useEffect,useState} from 'react';
const months=['Januar','Februar','Marts','April','Maj','Juni','Juli','August','September','Oktober','November','December'];
const directions=['N','NØ','Ø','SØ','S','SV','V','NV'];
type Stats={count:number;mean:number|null;above:Record<string,number>;directions:number[];directionCount:number};
type Month=Stats&{expected:number;years:(Stats&{year:number})[];hours:(Stats&{hour:number})[]};
type History={spot:string;period:number[];grid:number[];requested:number[];retrieved:string;modes:Record<string,Month[]>};
export default function HistoricalWind({spotId,spotName,unit}:{spotId:string;spotName:string;unit:'ms'|'kn'}){
 const [data,setData]=useState<History|null>(null),[error,setError]=useState(false),[month,setMonth]=useState<number|null>(null),[mode,setMode]=useState('all'),[limit,setLimit]=useState(8);
 useEffect(()=>{setMonth(Number(new Intl.DateTimeFormat('en',{timeZone:'Europe/Copenhagen',month:'numeric'}).format(new Date()))-1);},[]);
 useEffect(()=>{const controller=new AbortController();setData(null);setError(false);fetch(`/history/${encodeURIComponent(spotId)}.json`,{signal:controller.signal}).then(r=>{if(!r.ok)throw Error();return r.json();}).then((d:any)=>{if(d.spot!==spotId)throw Error();setData(d);}).catch(e=>{if(e.name!=='AbortError')setError(true);});return()=>controller.abort();},[spotId]);
 const s=data&&month!==null?data.modes[mode][month]:null;
 const factor=unit==='kn'?1.94384:1,label=unit==='kn'?'kn':'m/s';
 const num=(n:number|null)=>n===null?'—':(n*factor).toLocaleString('da-DK',{maximumFractionDigits:1,minimumFractionDigits:1});
 const pct=(n:number,total:number)=>total?Math.round(100*n/total)+' %':'—';
 const common=s?.directionCount?directions[s.directions.indexOf(Math.max(...s.directions))]:'—';
 return <section id="historisk-vind" className="my-6 rounded-2xl border border-cyan-200/20 bg-[#073b49] p-5 sm:p-6"><h2 className="text-2xl font-semibold">Sådan plejer vinden at være</h2><p className="mt-2 text-cyan-50/70">{spotName} · Historisk vind, 2016–2025</p>
 <div className="my-5 grid gap-4 sm:grid-cols-3"><label className="text-sm">Måned<select value={month??0} onChange={e=>setMonth(Number(e.target.value))} className="mt-2 block h-11 w-full rounded-lg bg-[#042934] px-3 text-base text-white">{months.map((m,i)=><option key={m} value={i}>{m}</option>)}</select></label><label className="text-sm">Tid på dagen<select value={mode} onChange={e=>setMode(e.target.value)} className="mt-2 block h-11 w-full rounded-lg bg-[#042934] px-3 text-base text-white"><option value="all">Hele døgnet</option><option value="day">Kl. 10–18, dansk tid</option></select></label><label className="text-sm">Din vindgrænse: {num(limit)} {label}<input aria-label="Historisk vindgrænse" type="range" min="4" max="20" step="1" value={limit} onChange={e=>setLimit(Number(e.target.value))} className="mt-4 block w-full accent-cyan-200"/></label></div>
 {error?<p role="alert">Historikken kunne ikke hentes for dette spot. Prøv at genindlæse siden.</p>:!s?<p role="status">Henter historisk vind…</p>:<>
 <div className="grid gap-4 sm:grid-cols-3"><div><p className="text-sm text-cyan-100/70">Gennemsnitlig vind</p><p className="mt-1 text-3xl font-semibold">{num(s.mean)} <span className="text-lg">{label}</span></p></div><div><p className="text-sm text-cyan-100/70">Timer med mindst {num(limit)} {label}</p><p className="mt-1 text-3xl font-semibold">{pct(s.above[limit],s.count)}</p></div><div><p className="text-sm text-cyan-100/70">Hyppigste vindretning</p><p className="mt-1 text-3xl font-semibold">{common}</p></div></div>
 <p className="mt-4 text-sm text-cyan-50/70">{months[month!]} på tværs af 10 år · {s.count.toLocaleString('da-DK')} gyldige timeværdier af {s.expected.toLocaleString('da-DK')} forventede. Vind i 10 meters højde.</p>
 <details className="mt-5 border-t border-white/15 pt-4"><summary className="cursor-pointer py-2 font-semibold">Se forskelle mellem år, vindretninger og tidspunkt</summary>
 <h3 className="mb-3 mt-5 font-semibold">Gennemsnit pr. år · {months[month!]}</h3><div className="space-y-2">{s.years.map(y=><div key={y.year} className="grid grid-cols-[3rem_1fr_5rem] items-center gap-3 text-sm"><span>{y.year}</span><div className="h-5 rounded bg-white/10"><div className="h-5 rounded bg-cyan-300/70" style={{width:`${y.mean===null?0:100*y.mean/Math.max(...s.years.map(v=>v.mean??0),1)}%`}}/></div><span className="text-right">{num(y.mean)} {label}</span></div>)}</div>
 <h3 className="mb-3 mt-6 font-semibold">Vindretning · hvor kommer vinden fra?</h3><div className="grid grid-cols-4 gap-3">{directions.map((d,i)=><div key={d} className="rounded-lg bg-white/5 p-2 text-center text-sm"><p>{d}</p><p>{pct(s.directions[i],s.directionCount)}</p></div>)}</div><p className="mt-2 text-sm text-cyan-50/60">Retningsfordelingen udelader vind under 0,5 m/s og påvirkes ikke af din vindgrænse.</p>
 <h3 className="mb-3 mt-6 font-semibold">Gennemsnit gennem dagen</h3><div className="grid grid-cols-3 gap-2 sm:grid-cols-6">{s.hours.map(h=><div key={h.hour} className="rounded-lg bg-white/5 p-2 text-sm"><p>Kl. {String(h.hour).padStart(2,'0')}</p><p>{num(h.mean)} {label}</p></div>)}</div>
 </details>
 <p className="mt-5 text-sm leading-6 text-cyan-50/65">Kilde: <a className="underline" href="https://open-meteo.com/en/docs/historical-weather-api" target="_blank" rel="noreferrer">ERA5 via Open-Meteo</a>, et beregnet vejrgrid på ca. 25 km. Gridpunkt: {data!.grid.join(', ')}. Statistikken gælder området og kan overse lokale vindforhold. Gennemsnittet er beregnet over gyldige timeværdier; vindgrænsen ændrer kun andelen af timer.</p>
 <p className="mt-2 text-sm leading-6 text-cyan-50/65">Vindtimer er ikke det samme som gode kitetimer. Bølger, vindstød, dagslys og brugbar vindretning er ikke med i andelen. Historikken ændrer ikke Window Score eller prognosens sikkerhed. Datasættet dækker de 10 afsluttede år før 2026.</p>
 </>}
 </section>;
}
