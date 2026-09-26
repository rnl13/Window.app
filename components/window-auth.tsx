'use client';

import {ClerkProvider,useAuth} from '@clerk/react';
import {Fragment,useEffect,useState,type ReactNode} from 'react';
import {registerTokenGetter} from '@/lib/auth-fetch';

export const clerkKey=process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY||'';

function SessionBridge({children}:{children:ReactNode}){
 const {isLoaded,sessionId,getToken}=useAuth();
 const authKey=isLoaded?(sessionId??'signed-out'):'loading';
 const [registeredKey,setRegisteredKey]=useState<string|null>(null);

 useEffect(()=>{
  if(!isLoaded)return;

  registerTokenGetter(()=>getToken());
  setRegisteredKey(authKey);

  return()=>registerTokenGetter(null);
 },[isLoaded,authKey,getToken]);

 if(!isLoaded||registeredKey!==authKey){
  return <p role="status" className="p-6">Åbner Window…</p>;
 }

 return <Fragment key={authKey}>{children}</Fragment>;
}

export default function WindowAuth({children}:{children:ReactNode}){
 if(!clerkKey)return children;

 return (
  <ClerkProvider
   publishableKey={clerkKey}
   signInUrl="/sign-in"
   signUpUrl="/sign-up"
   signInFallbackRedirectUrl="/ride#profile"
   signUpFallbackRedirectUrl="/ride#profile"
   afterSignOutUrl="/"
  >
   <SessionBridge>{children}</SessionBridge>
  </ClerkProvider>
 );
}
