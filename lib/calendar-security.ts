import {SITE_ORIGIN} from './site-config.ts';
export {SITE_ORIGIN};
export const GOOGLE_SCOPE='https://www.googleapis.com/auth/calendar.app.created';
export const REDIRECT_URI=SITE_ORIGIN+'/api/calendar/google-callback';
export const randomHex=(bytes=32)=>Array.from(crypto.getRandomValues(new Uint8Array(bytes)),b=>b.toString(16).padStart(2,'0')).join('');
export async function digest(value:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');}
export async function challenge(verifier:string){const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier)));return btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');}
async function key(secret:string){if(!/^[a-f0-9]{64}$/i.test(secret))throw new Error('Calendar unavailable');return crypto.subtle.importKey('raw',Uint8Array.from(secret.match(/../g)!,h=>parseInt(h,16)),{name:'AES-GCM'},false,['encrypt','decrypt']);}
export async function seal(value:string,secret:string,owner:string){const iv=crypto.getRandomValues(new Uint8Array(12));const data=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(owner)},await key(secret),new TextEncoder().encode(value));return btoa(String.fromCharCode(...iv,...new Uint8Array(data)));}
export async function unseal(value:string,secret:string,owner:string){const bytes=Uint8Array.from(atob(value),c=>c.charCodeAt(0));const data=await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes.slice(0,12),additionalData:new TextEncoder().encode(owner)},await key(secret),bytes.slice(12));return new TextDecoder().decode(data);}
export function sameOrigin(request:Request){return request.headers.get('Origin')===SITE_ORIGIN;}
