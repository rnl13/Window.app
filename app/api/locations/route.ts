export async function GET(request: Request) {
 const q = new URL(request.url).searchParams.get('q')?.trim() ?? '';
 if(q.length<2||q.length>100) return Response.json({error:'Skriv mellem 2 og 100 tegn.'},{status:400});
 const url=new URL('https://geocoding-api.open-meteo.com/v1/search');
 url.search=new URLSearchParams({name:q,count:'8',language:'da',format:'json'}).toString();
 try{
  const response=await fetch(url,{signal:AbortSignal.timeout(8000)});
  if(!response.ok) throw new Error('Provider unavailable');
  const data:any=await response.json();
  const results=(Array.isArray(data.results)?data.results:[]).filter((r:any)=>Number.isFinite(r.id)&&typeof r.name==='string'&&Number.isFinite(r.latitude)&&Math.abs(r.latitude)<=90&&Number.isFinite(r.longitude)&&Math.abs(r.longitude)<=180).map((r:any)=>({id:String(r.id),name:r.name,region:[r.admin1,r.country].filter(x=>typeof x==='string').join(', '),lat:r.latitude,lon:r.longitude}));
  return Response.json({results},{headers:{'Cache-Control':'private, max-age=3600'}});
 }catch{return Response.json({error:'Søgningen er ikke tilgængelig lige nu. Prøv igen.'},{status:502});}
}
