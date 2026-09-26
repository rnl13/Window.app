"""Derive exact calendar-day wind distributions from retained ERA5 snapshots. No new data fetch."""
import gzip,json,math,pathlib,datetime,zoneinfo
root=pathlib.Path(__file__).resolve().parent.parent
zone=zoneinfo.ZoneInfo('Europe/Copenhagen')
for source in (root/'data/history').glob('*.json.gz'):
    raw=json.load(gzip.open(source)); hourly=raw['data']['hourly']; days={}
    for t,v,d in zip(hourly['time'],hourly['wind_speed_10m'],hourly['wind_direction_10m']):
        if not isinstance(v,(int,float)) or not math.isfinite(v): continue
        local=datetime.datetime.fromisoformat(t).replace(tzinfo=datetime.timezone.utc).astimezone(zone)
        if not 2016<=local.year<=2025: continue
        key=local.strftime('%m-%d'); a=days.setdefault(key,{'n':0,'sum':0,'ge':[0]*31,'directions':[0]*8})
        a['n']+=1;a['sum']+=v
        for threshold in range(31):a['ge'][threshold]+=int(v>=threshold)
        if v>=.5 and isinstance(d,(int,float)) and math.isfinite(d):a['directions'][int((d+22.5)//45)%8]+=1
    for a in days.values():
        a['sum']=round(a['sum'],4)
        assert all(a['ge'][i]>=a['ge'][i+1] for i in range(30))
        assert a['ge'][0]==a['n'] and sum(a['directions'])<=a['n']
    out={'spotId':source.name.split('.')[0],'source':'ERA5 via Open-Meteo','kind':'reanalysis','years':[2016,2025],'timezone':'Europe/Copenhagen','provenance':raw['provenance'],'days':days}
    (root/'public/history'/f"{out['spotId']}-daily.json").write_text(json.dumps(out,separators=(',',':')))
    print(out['spotId'],sum(a['n'] for a in days.values()),'valid hours')
