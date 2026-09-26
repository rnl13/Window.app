import {SITE_ORIGIN} from './site-config';
import {env} from 'cloudflare:workers';
import {buildPushPayload} from '@block65/webcrypto-web-push';
import {unseal} from './calendar-security';
import {validSubscription} from './push-model';
export const pushEnv=()=>env as unknown as {PUSH_PUBLIC_KEY?:string;PUSH_PRIVATE_KEY?:string;PUSH_STORAGE_KEY?:string;PUSH_JOB_SECRET?:string;PUSH_SCHEDULER_ENABLED?:string};
export const pushReady=()=>{const e=pushEnv();return !!(e.PUSH_PUBLIC_KEY&&e.PUSH_PRIVATE_KEY&&e.PUSH_STORAGE_KEY);};
export async function sendPush(row:{subscription:string;user_id:string},message:Record<string,string>){
 const e=pushEnv(),sub=JSON.parse(await unseal(row.subscription,e.PUSH_STORAGE_KEY!,row.user_id));
 if(!validSubscription(sub))throw Error('Invalid subscription');
 const payload=await buildPushPayload({data:JSON.stringify(message),options:{ttl:300}},sub,{subject:SITE_ORIGIN,publicKey:e.PUSH_PUBLIC_KEY!,privateKey:e.PUSH_PRIVATE_KEY!});
 const result=await fetch(sub.endpoint,{...payload,redirect:'error',signal:AbortSignal.timeout(8000)});
 return result.status;
}
