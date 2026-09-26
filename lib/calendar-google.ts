import {eventBody,type CalendarPlan} from './calendar-model.ts';
export class GoogleError extends Error{status:number;code:string;constructor(status:number,code:string){super(code);this.status=status;this.code=code;}}
export async function tokenRequest(parameters:Record<string,string>){
 const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(parameters),signal:AbortSignal.timeout(12000)});
 const data=await r.json() as Record<string,any>;
 if(!r.ok||typeof data.access_token!=='string')throw new GoogleError(r.status,data.error==='invalid_grant'?'RECONNECT':'GOOGLE_UNAVAILABLE');
 return data;
}
export async function google(path:string,token:string,method='GET',body?:unknown){
 const r=await fetch('https://www.googleapis.com/calendar/v3/'+path,{method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(12000)});
 if(!r.ok)throw new GoogleError(r.status,[401,403].includes(r.status)?'RECONNECT':'GOOGLE_UNAVAILABLE');
 return r.status===204?{}:await r.json() as Record<string,any>;
}
// Client-generated stable event IDs make retry after an ambiguous network failure idempotent.
export async function syncGoogleEvent(calendarId:string,token:string,plan:CalendarPlan){
 const body=eventBody(plan),path=`calendars/${encodeURIComponent(calendarId)}/events`,eventPath=path+'/'+body.id;
 let old:Record<string,any>|null=null;
 try{old=await google(eventPath,token);}catch(e){if(!(e instanceof GoogleError&&[404,410].includes(e.status)))throw e;}
 if(old?.status==='cancelled'&&!plan.cancelled)throw new GoogleError(409,'EVENT_REMOVED');
 if(old&&old.extendedProperties?.private?.windowPlanId!==plan.id&&old.status!=='cancelled')throw new GoogleError(409,'EVENT_CONFLICT');
 if(plan.cancelled&&!old)return {id:body.id};
 if(plan.cancelled&&old?.status==='cancelled')return {id:body.id};
 const {id,...patch}=body;
 if(old)return google(eventPath,token,'PATCH',patch);
 try{return await google(path,token,'POST',body);}catch(e){
  if(!(e instanceof GoogleError&&e.status===409))throw e;
  const existing=await google(eventPath,token);
  if(existing.extendedProperties?.private?.windowPlanId!==plan.id||existing.status==='cancelled')throw new GoogleError(409,'EVENT_CONFLICT');
  return google(eventPath,token,'PATCH',patch);
 }
}
export const errorMessage=(code:string)=>({RECONNECT:'Google-adgangen skal forbindes igen.',EVENT_REMOVED:'Aftalen er slettet i Google. Opret en ny tur i Window.',EVENT_CONFLICT:'Aftalen kunne ikke opdateres sikkert.',GOOGLE_UNAVAILABLE:'Google svarede ikke som forventet. Turen er gemt i Window; prøv igen.'}[code]??'Synkronisering mislykkedes. Turen er gemt i Window; prøv igen.');
