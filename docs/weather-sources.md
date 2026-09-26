# Verified weather sources — 2026-09-13

| Source | Access / licence | Resolution / update | Implemented status |
|---|---|---|---|
| Open-Meteo ECMWF IFS 0.25 | JSON public pilot API; data CC BY 4.0, hosted free service noncommercial limits. Commercial service plan required for commercial use. | ~25km; model updates 6h; hourly API interpolation from native coarser steps. | Real calls, per-model immutable snapshots. Tested 120 rows for Agger. |
| Open-Meteo ECMWF AIFS Single | Same access; model ID ecmwf_aifs025_single | 0.25° (~28km), native 6h values interpolated hourly. | Real call tested. Kept in ECMWF family, not an independent ensemble member. |
| Open-Meteo GFS | Same hosted access; gfs_global | Grid/version-dependent, recorded resolution estimate 25km; not exact coastal resolution. | Real call tested with wind/gust/direction. |
| Open-Meteo DMI HARMONIE | Same hosted access; dmi_harmonie_arome_europe | ~2km regional model; coverage/forecast length varies. | Real call tested. No ECMWF seamless tail presented as independent DMI evidence. |
| Open-Meteo ECMWF WAM | Marine API; same attribution/service conditions | Nominal resolution field is an approximate 25km pilot estimate; native frequency and available parameters differ by product. | Real call tested for separate swell and wind-wave height/direction/period. No fake swell from total wave height. |
| DMI metObs | Open API; registration no longer needed. DMI open-data terms / CC BY 4.0. | Station point observations. Actual observed timestamp retained; retrieval asks for last 2h, latest per returned station within 50km. | Implemented raw wind observations, storage and UI. Quality explicitly unverified; no automatic confidence uplift. Agger check found one station about 34km away, which is not local launch truth. |
| DMI climateData | Open API with quality-control filters | Historical station values; availability and quality depend on parameter/station. | Researched, not connected. Appropriate candidate for controlled error validation. |
| Copernicus Marine WAVE_GLO_PHY_SWH_L3_NRT_014_001 | Marine Data Store, product licence and account/toolbox workflow must be followed for ingestion. | Product page lists 1.4 × 1.4km, along-track swaths, hourly temporal resolution and 3h update frequency. Update frequency is NOT a guaranteed latency or revisit at a spot. | Researched; satellite schema/interface only. No data fetched or presented as live. |
| OSI SAF / EUMETSAT ASCAT coastal winds | EUMETSAT/KNMI distribution. Exact selected product licence and operational download method still need confirmation. | Coastal 12.5km swath sampling documented in product discovery; effective resolution, latency, coast masks and per-spot revisit require product manual verification. | Researched candidate only; no claim of fully verified licence/latency. Interface returns unavailable. |
| ERA5 via Open-Meteo | CC BY attribution and service limits | Existing 2016–2025 grid reanalysis wind summaries for four original spots. | Preserved existing historical feature. Reanalysis is not ground-truth launch observations or calibrated forecast probability. |

Primary documentation reviewed:
- https://open-meteo.com/en/docs
- https://open-meteo.com/en/docs/ecmwf-api
- https://open-meteo.com/en/docs/dmi-api
- https://open-meteo.com/en/docs/marine-weather-api
- https://open-meteo.com/en/pricing
- https://www.dmi.dk/friedata/dokumentation/meteorological-observation-api
- https://www.dmi.dk/friedata/dokumentation/terms-of-use
- https://www.dmi.dk/friedata/dokumentation/faq
- https://www.dmi.dk/friedata/dokumentation/apis/climate-data-api-1
- https://data.marine.copernicus.eu/product/WAVE_GLO_PHY_SWH_L3_NRT_014_001/description
- https://osi-saf.eumetsat.int/ (product search result; detailed product manual not verified)

No satellite imagery analysis, local bias correction, model run reconstruction, observed wave ingestion or trained machine learning is represented as operational. Source availability does not establish local skill. Historical seasonal wind occurrence is deliberately not used as a probability that the current forecast is correct.
