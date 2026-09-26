export function validSubscription(value:any){
 try{const u=new URL(value?.endpoint);const h=u.hostname;
 if(u.protocol!=='https:'||u.port||u.username||u.password||u.hash||value.endpoint.length>2048)return false;
 if(!(h==='fcm.googleapis.com'||h==='updates.push.services.mozilla.com'||h==='push.services.mozilla.com'||h==='web.push.apple.com'||h.endsWith('.push.apple.com')))return false;
 const decode=(s:unknown)=>typeof s==='string'&&/^[A-Za-z0-9_-]+={0,2}$/.test(s)?Uint8Array.from(atob(s.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0)):null;
 const key=decode(value.keys?.p256dh),auth=decode(value.keys?.auth);
 return key?.length===65&&key[0]===4&&auth?.length===16;
 }catch{return false;}
}
