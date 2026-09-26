import json,math,gzip,hashlib,urllib.request,datetime,calendar
from pathlib import Path
from zoneinfo import ZoneInfo
BASE=Path(__file__).resolve().parents[1]
SPOTS={'agger-tange':(56.72373,8.221604),'hanstholm':(57.12057,8.6032),'mon-fyr':(54.956085,12.552391),'norre-vorupor':(56.960684,8.369138)}
for spot,(lat,lon) in SPOTS.items():
 raw=BASE/'data/history'/f'{spot}.json.gz'
 if not raw.exists():
  old=Path('/workspace/scratch/30671bc8ccf3/data-check/era5-hanstholm.json')
  if spot=='hanstholm' and old.exists(): wrapper=json.loads(old.read_text())
  else:
   url=f'https://archive-api.open-meteo.com/v1/archive?latitude={lat}&longitude={lon}&start_date=2016-01-01&end_date=2025-12-31&hourly=wind_speed_10m,wind_direction_10m&models=era5&wind_speed_unit=ms&timezone=GMT&cell_selection=nearest'
   with urllib.request.urlopen(url,timeout=90) as r:d=json.load(r)
   wrapper={'provenance':{'url':url,'fetched_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'requested':[lat,lon]},'data':d}
  raw.write_bytes(gzip.compress(json.dumps(wrapper,separators=(',',':')).encode(),mtime=0))
 wrapper=json.loads(gzip.decompress(raw.read_bytes()));d=wrapper['data'];h=d['hourly']
 assert d['hourly_units']['wind_speed_10m']=='m/s'
 assert len(h['time'])==len(h['wind_speed_10m'])==len(h['wind_direction_10m'])
 rows=[]
 for ts,v,dr in zip(h['time'],h['wind_speed_10m'],h['wind_direction_10m']):
  t=datetime.datetime.fromisoformat(ts).replace(tzinfo=datetime.timezone.utc).astimezone(ZoneInfo('Europe/Copenhagen'))
  if 2016<=t.year<=2025: rows.append((t,v,dr))
 def stats(rs):
  vs=[v for t,v,dr in rs if isinstance(v,(float,int)) and math.isfinite(v) and v>=0]
  ds=[int(((dr+22.5)%360)//45) for t,v,dr in rs if isinstance(v,(int,float)) and v>=.5 and isinstance(dr,(int,float)) and math.isfinite(dr) and 0<=dr<=360]
  return {'count':len(vs),'mean':round(sum(vs)/len(vs),3) if vs else None,'above':{str(k):sum(v>=k for v in vs) for k in range(4,21)},'directions':[ds.count(i) for i in range(8)],'directionCount':len(ds)}
 modes={}
 for mode in ['all','day']:
  months=[]
  for m in range(1,13):
   rs=[r for r in rows if r[0].month==m and (mode=='all' or 10<=r[0].hour<18)]
   s=stats(rs);s['years']=[dict(year=y,**stats([r for r in rs if r[0].year==y])) for y in range(2016,2026)]
   s['hours']=[dict(hour=hr,**stats([r for r in rs if r[0].hour==hr])) for hr in (range(24) if mode=='all' else range(10,18))]
   # Expected actual hours in local calendar month, including daylight-saving transitions.
   expected=0
   for y in range(2016,2026):
    if mode=='day':expected+=calendar.monthrange(y,m)[1]*8
    else:
     a=datetime.datetime(y,m,1,tzinfo=ZoneInfo('Europe/Copenhagen'));b=datetime.datetime(y+int(m==12),m%12+1,1,tzinfo=ZoneInfo('Europe/Copenhagen'))
     expected+=int((b.timestamp()-a.timestamp())/3600)
   s['expected']=expected;months.append(s)
  modes[mode]=months
 out={'spot':spot,'period':[2016,2025],'height':10,'source':'ERA5 via Open-Meteo','sourceUrl':'https://open-meteo.com/en/docs/historical-weather-api','requested':[lat,lon],'grid':[d['latitude'],d['longitude']],'retrieved':wrapper['provenance']['fetched_at'],'rawSha256':hashlib.sha256(raw.read_bytes()).hexdigest(),'modes':modes}
 (BASE/'public/history'/f'{spot}.json').write_text(json.dumps(out,separators=(',',':')))
 print(spot,'hours',sum(m['count'] for m in modes['all']),'grid',out['grid'],flush=True)
