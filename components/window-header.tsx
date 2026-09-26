'use client';

import {Waves,Compass,SlidersHorizontal,LogIn} from 'lucide-react';
import {useAuth} from '@clerk/react';

export default function WindowHeader({active}:{active:'explore'|'ride'}){
 const {isLoaded,isSignedIn}=useAuth();

 return <header className="site-header">
  <a href="/" className="brand">
   <span className="brand-icon"><Waves size={23}/></span>
   window<span className="brand-dot">.</span>
  </a>

  <nav aria-label="Hovednavigation">
   <a href="/" aria-current={active==='explore'?'page':undefined}>
    <Compass size={17}/> Explore
   </a>
   <a href="/ride" aria-current={active==='ride'?'page':undefined}>
    Mine windows
   </a>
   <a href="/calendar">Mine ture</a>
  </nav>

  {!isLoaded
   ? <span className="profile-link">...</span>
   : isSignedIn
    ? <a className="profile-link" href="/ride#profile">
       <SlidersHorizontal size={17}/>
       <span>Min profil</span>
      </a>
    : <a className="profile-link" href="/sign-in?return_to=%2Fride%23profile">
       <LogIn size={17}/>
       <span>Log ind</span>
      </a>
  }
 </header>;
}
