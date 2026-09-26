'use client';
import {useEffect,useRef,useState} from 'react';
import {Plus,Minus,LocateFixed} from 'lucide-react';
import type {Spot} from '@/lib/intelligence/types';
const project=(lat:number,lon:number,z:number)=>{const scale=256*2**z;return {x:(lon+180)/360*scale,y:(1-Math.log(Math.tan(lat*Math.PI/180)+1/Math.cos(lat*Math.PI/180))/Math.PI)/2*scale};};
export default function SpotMap({spots,selected,onSelect,scores,region}:{spots:Spot[];selected:string|null;onSelect:(id:string)=>void;scores:Record<string,number|null>;region:string}){
 const ref=useRef<HTMLDivElement>(null),drag=useRef<{x:number;y:number;cx:number;cy:number}|null>(null);
 const [size,setSize]=useState({width:900,height:470}),[view,setView]=useState({lat:56.94,lon:8.43,z:9}),[offset,setOffset]=useState({x:0,y:0}),[failed,setFailed]=useState(false);
 const reset=()=>{setView(region==='thy'?{lat:56.94,lon:8.43,z:9}:region==='zealand'?{lat:55.56,lon:12.1,z:7}:{lat:56.05,lon:10.5,z:6});setOffset({x:0,y:0});setFailed(false);};
 useEffect(reset,[region]);
 useEffect(()=>{if(!ref.current)return;const observer=new ResizeObserver(([e])=>setSize({width:e.contentRect.width,height:e.contentRect.height}));observer.observe(ref.current);return()=>observer.disconnect();},[]);
 const center=project(view.lat,view.lon,view.z),left=center.x-size.width/2-offset.x,top=center.y-size.height/2-offset.y;
 const tiles=[];for(let x=Math.floor(left/256);x<=Math.floor((left+size.width)/256);x++)for(let y=Math.floor(top/256);y<=Math.floor((top+size.height)/256);y++)if(y>=0&&y<2**view.z)tiles.push({x,y});
 const pins: {spot:Spot;x:number;y:number;actualX:number;actualY:number}[]=[];
 for(const spot of spots){const p=project(spot.lat,spot.lon,view.z);let x=p.x-left,y=p.y-top;const width=size.width<700?50:165;if(pins.some(other=>Math.abs(other.x-x)<width&&Math.abs(other.y-y)<50)){x=x+width+12<size.width-50?x+width+12:x-width-12;}while(pins.some(other=>Math.abs(other.x-x)<width&&Math.abs(other.y-y)<50))y+=52;pins.push({spot,x,y,actualX:p.x-left,actualY:p.y-top});}
 function zoom(delta:number){const next=Math.max(5,Math.min(14,view.z+delta));setOffset({x:offset.x*2**(next-view.z),y:offset.y*2**(next-view.z)});setView({...view,z:next});}
 return <div ref={ref} className="spot-map" role="region" tabIndex={0} aria-label="Kort over spots. Piletaster flytter kortet; plus og minus zoomer." onKeyDown={e=>{if(e.target!==e.currentTarget)return;const moves:Record<string,[number,number]>={ArrowLeft:[60,0],ArrowRight:[-60,0],ArrowUp:[0,60],ArrowDown:[0,-60]};if(moves[e.key]){e.preventDefault();setOffset({x:offset.x+moves[e.key][0],y:offset.y+moves[e.key][1]});}if(e.key==='+')zoom(1);if(e.key==='-')zoom(-1);}} onPointerDown={e=>{if((e.target as HTMLElement).closest('button,a')||e.pointerType==='touch')return;drag.current={x:e.clientX,y:e.clientY,cx:offset.x,cy:offset.y};e.currentTarget.setPointerCapture(e.pointerId);}} onPointerMove={e=>{const d=drag.current;if(d)setOffset({x:d.cx+e.clientX-d.x,y:d.cy+e.clientY-d.y});}} onPointerUp={()=>drag.current=null} onPointerCancel={()=>drag.current=null}>
 <div className="map-tiles" aria-hidden="true">{tiles.map(t=><img key={`${view.z}/${t.x}/${t.y}`} draggable={false} alt="" width="256" height="256" src={`https://tile.openstreetmap.org/${view.z}/${((t.x%2**view.z)+2**view.z)%2**view.z}/${t.y}.png`} onError={()=>setFailed(true)} style={{left:t.x*256-left,top:t.y*256-top}}/>)}</div>
 <div className="map-caption">{spots.length} spots · {region==='thy'?'Thy & Cold Hawaii':region==='zealand'?'Sjælland & Nordkysten':'Danmark'}</div>
 {failed&&<p className="map-error">Kortbaggrunden er utilgængelig. Alle spots kan vælges i listen.</p>}
 <svg className="map-leaders" aria-hidden="true">{pins.filter(p=>p.y!==p.actualY||p.x!==p.actualX).map(p=><g key={p.spot.id}><line x1={p.actualX} y1={p.actualY} x2={p.x} y2={p.y} stroke="#365c56"/><circle cx={p.actualX} cy={p.actualY} r="3" fill="#365c56"/></g>)}</svg>
 {pins.map(({spot:s,x,y})=>{const score=scores[s.id];return <button key={s.id} className={`map-pin ${selected===s.id?'selected':''} ${score==null?'unrated':score>=70?'good':'fair'}`} style={{left:x,top:y}} onClick={()=>onSelect(s.id)} aria-pressed={selected===s.id} aria-label={`${s.name}, ${score??'ingen'} i fit, vælg spot`}><span>{score??'—'}</span><strong>{s.name.replace(' · Agger Tange','')}</strong></button>;})}
 <div className="map-controls"><button aria-label="Zoom ind" disabled={view.z>=14} onClick={()=>zoom(1)}><Plus size={19}/></button><button aria-label="Zoom ud" disabled={view.z<=5} onClick={()=>zoom(-1)}><Minus size={19}/></button><button aria-label="Vis alle spots i området" onClick={reset}><LocateFixed size={19}/></button></div>
 <div className="map-legend"><i/> 70+ godt match <i className="fair"/> under 70 <span>— mangler match</span></div>
 <a className="map-credit" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap</a>
 </div>;
}
