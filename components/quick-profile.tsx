'use client';
import {SPORTS} from '@/lib/intelligence/catalog';
import {hasEquipment,newId} from '@/lib/intelligence/engine';
import type {DisciplinePriority,User} from '@/lib/intelligence/types';

const gearNames:Record<string,string>={
 kite:'Kite',
 'kite-wave-board':'Waveboard / strapless board',
 twintip:'Twintip',
 kitefoil:'Kitefoil',
 surfboard:'Shortboard',
 longboard:'Longboard',
 'surf-foil':'Surf foil',
 wing:'Wing',
 wingfoil:'Wingfoil board og foil',
 'windsurf-rig':'Windsurfsejl og rig',
 'windsurf-board':'Windsurfboard',
 'windsurf-foil':'Windsurf foil',
 sup:'SUP-board',
 paddle:'Paddle',
 'downwind-foil':'Downwind foil'
};

export default function QuickProfile({
 profile,
 onChange,
 onContinue
}:{
 profile:User;
 onChange:(p:User)=>void;
 onContinue:()=>void;
}){
 const sports=[...SPORTS,...profile.customSports];
 const groups=[...new Set(sports.map(s=>s.name))];
 const selected=sports.filter(s=>profile.sportIds.includes(s.id));
 const needed=[...new Set(selected.flatMap(s=>s.equipmentKinds))];

 const preference=(id:string)=>profile.disciplinePreferences?.[id]??{
  priority:'primary' as DisciplinePriority,
  notify:false
 };

 function setSport(id:string,checked:boolean){
  if(checked){
   onChange({...profile,sportIds:[...new Set([...profile.sportIds,id])]});
   return;
  }
  const prefs={...(profile.disciplinePreferences??{})};
  delete prefs[id];
  onChange({
   ...profile,
   sportIds:profile.sportIds.filter(x=>x!==id),
   disciplinePreferences:prefs
  });
 }

 function setGroup(ids:string[],select:boolean){
  if(select){
   onChange({...profile,sportIds:[...new Set([...profile.sportIds,...ids])]});
   return;
  }
  const prefs={...(profile.disciplinePreferences??{})};
  ids.forEach(id=>delete prefs[id]);
  onChange({
   ...profile,
   sportIds:profile.sportIds.filter(id=>!ids.includes(id)),
   disciplinePreferences:prefs
  });
 }

 function setPreference(id:string,patch:Partial<{priority:DisciplinePriority;notify:boolean}>){
  const current=preference(id);
  const next={...current,...patch};
  if(next.priority==='hidden')next.notify=false;
  onChange({
   ...profile,
   disciplinePreferences:{
    ...(profile.disciplinePreferences??{}),
    [id]:next
   }
  });
 }

 const primaryCount=selected.filter(s=>preference(s.id).priority==='primary').length;
 const notificationCount=selected.filter(s=>preference(s.id).notify).length;

 return <div className="quick-profile">
  <p className="ride-intro">Vælg dine sportsgrene og dit niveau. Derefter kan du fortælle Window, hvad der er vigtigst for dig.</p>

  <fieldset>
   <legend>1. Hvad vil du på vandet med?</legend>
   <div className="sport-groups">
    {groups.map(name=>{
     const items=sports.filter(s=>s.name===name);
     const count=items.filter(s=>profile.sportIds.includes(s.id)).length;
     const ids=items.map(s=>s.id);
     return <details key={name} className="sport-group" open={count>0||undefined}>
      <summary>{name}<span>{count?`${count} valgt`:'Vælg'}</span></summary>
      <div className="discipline-choices">
       <button
        type="button"
        className="select-disciplines"
        onClick={()=>setGroup(ids,count!==items.length)}
       >
        {count===items.length?'Fravælg alle':'Vælg alle discipliner'}
       </button>

       {items.map(s=><label key={s.id}>
        <input
         type="checkbox"
         checked={profile.sportIds.includes(s.id)}
         onChange={e=>setSport(s.id,e.target.checked)}
        />
        <span>
         {s.discipline}
         {s.minimumLevel==='experienced'&&<small> · kræver erfaring</small>}
        </span>
       </label>)}
      </div>
     </details>;
    })}
   </div>
  </fieldset>

  <fieldset>
   <legend>2. Hvilket niveau passer til dig?</legend>
   <div className="level-choices">
    {([
     {id:'beginner',label:'Begynder'},
     {id:'intermediate',label:'Øvet'},
     {id:'experienced',label:'Erfaren'}
    ] as const).map(l=><label key={l.id} className={profile.level===l.id?'selected':''}>
     <input
      type="radio"
      name="rider-level"
      value={l.id}
      checked={profile.level===l.id}
      onChange={()=>onChange({...profile,level:l.id})}
     />
     {l.label}
    </label>)}
   </div>
   <p className="ride-intro">Vælg det laveste niveau, hvis din erfaring varierer mellem sportsgrenene.</p>
  </fieldset>

  {selected.length>0&&<fieldset>
   <legend>3. Hvad er vigtigst for dig?</legend>
   <p className="ride-intro">
    Primære discipliner skal Window aktivt fremhæve. Sekundære discipliner kan bruges som backup, især på ture. Skjulte discipliner skal ikke dominere dine personlige anbefalinger.
   </p>

   <div className="discipline-priority-list">
    {selected.map(s=>{
     const pref=preference(s.id);
     return <div className="discipline-priority-card" key={s.id}>
      <div className="discipline-priority-heading">
       <strong>{s.name} · {s.discipline}</strong>
      </div>

      <label>
       Prioritet
       <select
        className="ride-input"
        value={pref.priority}
        onChange={e=>setPreference(s.id,{
         priority:e.target.value as DisciplinePriority
        })}
       >
        <option value="primary">Primær · fremhæv denne</option>
        <option value="secondary">Sekundær · brug som backup</option>
        <option value="hidden">Skjult · vis ikke som personlig anbefaling</option>
       </select>
      </label>

      <label className="discipline-notify">
       <input
        type="checkbox"
        checked={pref.notify}
        disabled={pref.priority==='hidden'}
        onChange={e=>setPreference(s.id,{notify:e.target.checked})}
       />
       <span>
        Varsl mig om gode windows i denne disciplin
        {pref.priority==='hidden'&&<small>Vælg Primær eller Sekundær for at aktivere varsler.</small>}
       </span>
      </label>
     </div>;
    })}
   </div>
  </fieldset>}

  <div className="profile-ready" role="status">
   {selected.length
    ?`${selected.length} ${selected.length===1?'disciplin valgt':'discipliner valgt'} · ${primaryCount} primære · ${notificationCount} med varsler. ${profile.equipmentOnly?'Dit udstyrsfilter er aktivt.':'Udstyr er valgfrit.'}`
    :'Vælg mindst én disciplin for at få forslag.'}
  </div>

  <button
   className="ride-button profile-continue"
   disabled={!selected.length}
   onClick={onContinue}
  >
   Videre til forslag
  </button>

  <p className="ride-intro">
   Dine prioriteter gemmes sammen med din profil. I næste trin bruger vi dem direkte i Window-rangeringen.
  </p>

  <details className="profile-extra">
   <summary>Mit udstyr · valgfrit</summary>
   <p className="ride-intro">
    Tilføj udstyr, hvis du vil holde styr på det. Navne, størrelser og registrering er valgfrie.
   </p>

   <label className="equipment-toggle">
    <input
     type="checkbox"
     checked={profile.equipmentOnly===true}
     onChange={e=>onChange({...profile,equipmentOnly:e.target.checked})}
    />
    <span>Vis kun forslag med mit registrerede udstyr</span>
   </label>

   {profile.equipmentOnly&&<p className="ride-intro">
    Discipliner skjules, hvis deres udstyr ikke er registreret. Slå filteret fra for at se alle dine valgte discipliner.
   </p>}

   {needed.length>0&&<div className="gear-choices">
    {needed.map(kind=>{
     const has=profile.equipment.some(g=>g.kind===kind);
     return <label key={kind}>
      <input
       type="checkbox"
       checked={has}
       onChange={e=>{
        if(e.target.checked){
         onChange({
          ...profile,
          equipment:[
           ...profile.equipment,
           {
            id:newId(),
            kind,
            name:gearNames[kind]??kind,
            size:null,
            sportIds:[]
           }
          ]
         });
        }else if(
         profile.equipment.filter(g=>g.kind===kind).every(
          g=>g.size===null&&g.name===(gearNames[kind]??kind)
         )||window.confirm('Fjern det registrerede udstyr af denne type fra profilen?')
        ){
         onChange({
          ...profile,
          equipment:profile.equipment.filter(g=>g.kind!==kind)
         });
        }
       }}
      />
      {gearNames[kind]??profile.customSports.find(s=>s.id===kind)?.name??kind}
     </label>;
    })}
   </div>}

   {profile.equipmentOnly&&selected.some(s=>!hasEquipment(s,profile))&&<p className="gear-warning">
    Skjult af udstyrsfilteret: {selected.filter(s=>!hasEquipment(s,profile)).map(s=>`${s.name} ${s.discipline}`).join(', ')}.
   </p>}
  </details>
 </div>;
}
