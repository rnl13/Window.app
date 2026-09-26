'use client';
import {ClerkProvider,useAuth} from '@clerk/react';
import {useEffect,useState,type ReactNode} from 'react';
import {registerTokenGetter} from '@/lib/auth-fetch';
export const clerkKey=process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY||'';
function SessionBridge({children}:{children:ReactNode}){
 const {isLoaded,getToken}=useAuth();const [ready,setReady]=useState(false);
 useEffect(()=>{if(isLoaded){registerTokenGetter(()=>getToken());setReady(true);}return()=>registerTokenGetter(null);},[isLoaded,getToken]);
 return ready?children:<p role="status" className="p-6">Åbner Window…</p>;
}
export default function WindowAuth({children}:{children:ReactNode}){
 if(!clerkKey)return children;
 return <ClerkProvider publishableKey={clerkKey} signInUrl="/sign-in" signUpUrl="/sign-up" signInFallbackRedirectUrl="/ride#profile" signUpFallbackRedirectUrl="/ride#profile" afterSignOutUrl="/"><SessionBridge>{children}</SessionBridge></ClerkProvider>;
}
