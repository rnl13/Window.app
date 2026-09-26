import {verifiedUserId,type AuthConfig} from './auth-verification';
import {env} from 'cloudflare:workers';
export type CalendarEnv=AuthConfig & {DB:D1Database;GOOGLE_CALENDAR_CLIENT_ID?:string;GOOGLE_CALENDAR_CLIENT_SECRET?:string;CALENDAR_TOKEN_KEY?:string};
export const runtime=()=>env as unknown as CalendarEnv;
export const configured=()=>{const e=runtime();return !!(e.DB&&e.GOOGLE_CALENDAR_CLIENT_ID&&e.GOOGLE_CALENDAR_CLIENT_SECRET&&e.CALENDAR_TOKEN_KEY&&/^[a-f0-9]{64}$/i.test(e.CALENDAR_TOKEN_KEY));};
export const db=()=>{const database=runtime().DB;if(!database)throw new Error('Calendar unavailable');return database;};
export const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
export const userId=(r:Request)=>verifiedUserId(r,runtime());
export const go=(path:string)=>new Response(null,{status:303,headers:{Location:path,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
