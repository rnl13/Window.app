export const SITE_ORIGIN=process.env.NEXT_PUBLIC_SITE_ORIGIN||'http://localhost:5173';
export function safeReturnTo(value:string|null){
 if(!value||!value.startsWith('/')||value.startsWith('//')||value.includes('\\'))return '/ride#profile';
 try{const url=new URL(value,'https://window.invalid');return url.origin==='https://window.invalid'?url.pathname+url.search+url.hash:'/ride#profile';}catch{return '/ride#profile';}
}
