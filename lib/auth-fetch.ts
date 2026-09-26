type TokenGetter=()=>Promise<string|null>;
let getToken:TokenGetter|null=null;
export function registerTokenGetter(getter:TokenGetter|null){getToken=getter;}
export async function authFetch(input:RequestInfo|URL,init?:RequestInit):Promise<Response>{
 const url=new URL(typeof input==='string'?input:input instanceof URL?input.href:input.url,window.location.origin);
 if(url.origin!==window.location.origin)throw new Error('Private requests must stay on Window');
 const headers=new Headers(init?.headers??(input instanceof Request?input.headers:undefined));
 if(getToken){const token=await getToken();if(token)headers.set('Authorization','Bearer '+token);}
 return fetch(input,{...init,headers,credentials:'same-origin'});
}
