'use client';
import {SignIn,SignUp,UserButton,useAuth} from '@clerk/react';
import {useEffect,useState} from 'react';
import {clerkKey} from './window-auth';
import {safeReturnTo} from '@/lib/site-config';
function Entry({signup}:{signup:boolean}){
 const [returnTo,setReturnTo]=useState<string|null>(null);const {isSignedIn}=useAuth();
 useEffect(()=>setReturnTo(safeReturnTo(new URLSearchParams(window.location.search).get('return_to'))),[]);
 if(!returnTo)return <p>Åbner login…</p>;
 if(isSignedIn)return <><p>Du er logget ind.</p><UserButton/><a href={returnTo}>Fortsæt til Window</a></>;
 const query='?return_to='+encodeURIComponent(returnTo);
 return signup?<SignUp routing="hash" signInUrl={'/sign-in'+query} forceRedirectUrl={returnTo}/>:<SignIn routing="hash" signUpUrl={'/sign-up'+query} forceRedirectUrl={returnTo}/>;
}
export default function AccountEntry({signup=false}:{signup?:boolean}){
 return <main className="mx-auto flex max-w-lg flex-col gap-5 p-6"><a href="/">← Window</a><h1 className="text-2xl font-semibold">{signup?'Opret din Window-konto':'Log ind på Window'}</h1>{clerkKey?<Entry signup={signup}/>:<p>Login er ikke aktiveret endnu. Du kan stadig udforske spots og prognoser.</p>}</main>;
}
