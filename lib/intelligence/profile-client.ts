import {authFetch} from '../auth-fetch.ts';
import {validUser} from './validation.ts';
import type {User} from './types.ts';
export async function readProfile(fetcher:typeof fetch=authFetch){
 const response=await fetcher('/api/rider',{signal:AbortSignal.timeout(8000)});
 if(response.status===401)return {profile:null,records:[],authenticated:false};
 if(!response.ok)throw new Error('Din gemte profil kunne ikke hentes. Genindlæs før du gemmer ændringer.');
 const data=await response.json() as {profile:unknown;records:unknown[]};
 if(data.profile!==null&&!validUser(data.profile))throw new Error('Den gemte profil kunne ikke læses. Genindlæs før du gemmer ændringer.');
 return {...data,profile:data.profile as User|null,authenticated:true};
}
export function restoreProfile(draft:string|null,saved:User|null):User|null{
 try{const value=JSON.parse(draft??'null');if(validUser(value))return value;}catch{}
 return saved;
}
