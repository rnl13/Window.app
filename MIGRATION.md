# Overførsel af gemte data

Status: kun kode og de statiske data er kopieret. Ingen private produktionsposter er eksporteret, ændret eller importeret.

## Bevar ejerskab

De gamle profiler bruger et Sites-specifikt bruger-id. De nye bruger Clerk-id. Id'er eller e-mailadresser må ikke bruges til automatisk at overtage en profil uden verificeret ejerskab. Opret en eksplicit godkendt mapping efter login i begge systemer; for ejerens egen profil kan ejeren bekræfte de to konti. Andre brugeres poster afventer tilsvarende bekræftelse.

## Datagrupper

- `rider_profiles` og `rider_records`: eksportér med godkendt adgang, importér med verificeret id-mapping. Bevar profiler, udstyr, regler, vurderinger og feedback uændret.
- `intelligence_batches`, `observation_records` og `forecast_errors`: kan eksporteres separat, hvis historikken skal bevares. Nye prognoser kan ellers hentes igen; gemte vurderinger indeholder deres egen vurderingskopi.
- `calendar_connections` og `calendar_oauth`: overfør ikke tokens/engangsstate. Brugerne forbinder Google igen. Gamle kalenderaftaler slettes ikke; flytning af planer kræver valg af eksisterende kalender og kontrol mod dubletter.
- `calendar_plans`: arkivér før ændringer; genaktiver ikke synkronisering blindt mod en ny tom kalender.
- `push_subscriptions`, `push_deliveries`, `push_jobs`: browserabonnementer hører til den gamle origin. Brugerne tilmelder sig igen; kopiering aktiverer dem ikke på den nye adresse.

## Rækkefølge

1. Opret ny database og anvend de tre eksisterende migrationer.
2. Tag en adgangsbeskyttet eksport af eventuelle relevante gamle poster.
3. Test import i en separat database med verificeret mapping.
4. Sammenlign antal og indhold før og efter import; test mindst to brugeres isolation.
5. Test den nye app med rigtig e-mail og de ønskede integrationer.
6. Skift først derefter den offentlige adresse. Den gamle udgave kan blive stående, indtil det nye forløb er godkendt.

Der er ingen implementeret automatisk kontooverførsel, og denne pakke indeholder ingen private brugerdata.

## Udført kontrol 26. september 2026

- TypeScript: bestået.
- Alle 50 automatiske testforløb: bestået, inklusive kalender-, push-, profil-, login- og prognoselogik.
- Selvstændigt produktionsbuild: bestået.
- Wrangler deployment dry-run: bestået; ingen publicering udført.
- Original version 30 og dens repository er uændret.
- Mangler: ejerens Cloudflare/D1-konfiguration, Clerk-applikation og nøgler, GitHub-destination, rigtig browser-login-test samt eventuel datamigrering.
