# Window — fast projekt og genoptagelse

Dette er det eksisterende Window Sites-projekt. Opret ikke en erstatningsapp.

- Sites-projekt: `appgprj_6a95c0f0d0348191ada1c8e890360114`
- Autoritativ kode: dette repository, branch `main`.
- Eksisterende offentlig app: https://window-kitesurf.rasmusniewaldlarsen.chatgpt.site
- Seneste arbejde: Explore og profil er integreret; forsiden er forenklet 25. september 2026.

## Hvad der er implementeret

Explore på `/`: geografisk spot-overblik, map/list-valg, regions-, sports- og dagfiltre, personlige fit-scores, detaljer og gennemgående planlægningslinks. Høfde 72/Agger Tange, Klitmøller, Hanstholm, Middles og øvrige eksisterende spots er med.

Spotdetaljer: bedste sammenhængende to-timers interval, disciplinvalg, vind og swell med fra-retninger, periode, kystvinkel når kendt, forecast kl. 09/12/15/18/21 og modeldata. Tidevand og ukendte oplysninger vises som manglende.

Profiler: eksisterende konto, niveau, gear og egne regler genbruges. Stance, bølgeside, transportgrænse/køretider og træningsmål kan gemmes. Stance og bølgeside er ikke aktive i fit uden kendt brudgeometri. Træningsmål finder disciplinens windows, ikke trick-specifik egnethed.

Den oprindelige forside er bevaret på `/forecast`. `/ride`, `/calendar`, `/decision-lab` og `/push` er bevaret.

## Verifikation og begrænsninger

Se `tests/EXPLORE-QA.md`. 37 testforløb bestod, TypeScript og produktionens build bestod. Desktop og 390px mobilvisning blev visuelt gennemgået. Fejltilstande og fulde resultater blev afprøvet; sidstnævnte med syntetiske, udelukkende lokale testdata. Der er ingen testprognoser i det publicerbare produkt.

Vindleverandørerne gav timeout i testmiljøet. Live-forecast og et autentificeret end-to-end-forløb med gemt tur/påmindelse mangler stadig verifikation. Der blev ikke sendt påmindelser eller oprettet kalenderaftaler under testen.

## Næste arbejdstrin

1. Åbn samme Sites-projekt, hent nyeste main, og bevar eventuelle nyere ændringer.
2. Kontroller live-vind og marine-data samt autentificeret profil → planlægning → gem tur, uden at sende uønskede påmindelser.
3. Valider lokal geometri før stance/frontside/backside kan ændre fit; Middles har kun en omtrentlig områdeplacering.
4. Kontrollér den offentliggjorte version på den eksisterende Window-adresse efter nye ændringer.

For at fortsætte i samtalen: “Fortsæt Window fra det eksisterende Sites-projekt og læs WINDOW-PROJECT.md.”

## Opfølgning: profil og formularer (22. september 2026)
Mine windows deler nu navigation, farver og formularstil med Explore. Profilen er placeret før planlægning og grupperer discipliner efter sport; relevante udstyrstyper kan bekræftes med afkrydsning uden navne/størrelser. En oversigt viser sportens typiske vejrintervaller og manglende udstyr; den eksisterende motor er uændret. Avancerede regler og valg er bevaret i fold-ud-felter. Eksisterende gemte profiler og udstyrsdetaljer bevares.
Tomme talfelter forbliver tomme i stedet for at blive til 0. Obligatorisk vandtid og køretid valideres ved handling. Browserkontrol bekræftede tom maks.-køretid, sletning af 0 i spot-køretid, udstyrsvalg og besked ved tom vandtid. Ingen personlige kontodata eller kalenderaftaler blev skrevet under denne kontrol.

## Opfølgning: lettere spotvalg (25. september 2026)

Explore viser dagens bedste match med disciplin, spot, tidsrum, fit og forecast confidence før kortet. Et valgt spot åbnes direkte under kortet, og den gentagne anbefaling længere nede er fjernet. Hvis alle aktuelle prognoser fejler, står der nu tydeligt, at data mangler, med mulighed for at prøve igen både øverst og i spotdetaljen. Lokal gennemgang bekræftede kort → spotdetalje; TypeScript, Explore-tests og produktionens build bestod. Live vejrdata kunne ikke hentes i det lokale testmiljø, så denne del er ikke end-to-end-verificeret.

## Opfølgning: Mine Windows uden obligatorisk udstyr (25. september 2026)

- Profilen kræver kun discipliner og niveau for at få forslag; der skal ikke oprettes udstyr eller gives lagringssamtykke for at søge.
- `equipmentOnly` er et valgfrit felt og standardmæssigt slået fra, også for ældre profiler uden feltet. Et eksplicit filter kræver de registrerede udstyrstyper som tidligere. Eksisterende udstyr bevares.
- Hurtigsøgning: område + dag → to timers vandtid, uden transportberegning. `suggestForDay` bruger den eksisterende motor med `includeTravel:false`, bevarer niveau, dagslys og hårde vejrgrænser og returnerer kun eligible muligheder. Turplanlægning og kalender kræver stadig særskilt beregning med køretid.
- Områdevalg kan gemmes som `preferredRegion`. Profilvalg gemmes midlertidigt i sessionStorage ved klik på login, så de kan genskabes ved retur; samtykke kræves stadig for serverlagring.
- Lynæs, Liseleje og Tisvildeleje er tilføjet. Se `docs/spots.md` for koordinatkilder og begrænsninger.
- 39 regressionstests, TypeScript og produktionsbuild bestod. Browsergennemgang bekræftede valg af Freeride uden udstyr, hurtigsøgning med lokale syntetiske prognoser, forslag fra fem sjællandske spots, overgang til turplanlægning og til/fra af det eksplicitte udstyrsfilter. Der blev ikke gemt en rigtig profil eller kalenderaftale.
- Den lokale previewdatabase manglede oprindeligt sit eksisterende skema; migrationerne blev anvendt udelukkende lokalt. Hentning af aktuelle prognoser lykkedes heller ikke derefter. Positive browserresultater kom fra midlertidige lokale testdata, som blev fjernet efter testen. Ingen testprognoser indgår i den publicerede version. Autentificeret lagring og live-prognoser mangler stadig end-to-end-verifikation.

## Opfølgning: pålidelighed og forklaringer (25. september 2026, v29)

- Produktionsdiagnose før ændringen: `/api/intelligence?spot=amager` returnerede HTTP 200, 600 snapshots, alle fem modeller, ingen advarsler og `stored:true`. Liveforecast og snapshotlagring er dermed bekræftet for dette kald. Alle eksisterende D1-tabeller findes; seneste fejl-log var tom. Direkte Node-fetch i udviklingsmiljøet gav timeout; med miljøets proxy aktiveret kom alle modeller tilbage. Dette er ikke dokumentation for en produktionsfejl hos leverandøren.
- Prognoser kan nu vises, selv hvis cache/historiklagring fejler. Manglende lagring markeres, og sessionsdagbog kræver en gemt prognose. Stationsfejl og fejl i separat observationsarkivering blokerer ikke prognoser.
- Profilhentning skelner mellem ikke logget ind og serverfejl. Ved mislykket indlæsning forhindres overskrivning af en mulig gemt profil. Login-kladden kan stadig genskabes. Profilgemning læser profilen tilbage og bekræfter indholdet før succesbeskeden.
- Mine Windows forklarer vejrintervaller over hele vinduet, foretrukne forhold, kystrelativ vind, primær model og hentetid. Ukendt prognosesikkerhed forklares som manglende dokumentation, ikke manglende vejrdata.
- 44 motor-/klienttests og en integrationstest af den faktiske rider-route med SQLite består; sidstnævnte kontrollerer rundtur, konto-isolation, login- og origin-kontrol. TypeScript og produktionsbuild består. Ingen rigtige personprofiler er ændret. Browserlogin → privat lagring på en rigtig konto og kalenderintegration er fortsat ikke end-to-end-verificeret.
- Browserkontrol: SUP Touring uden udstyr gav Amager-vindue fra den reelle produktionsprognose kopieret til lokal previewcache. Forklaringen viste 2,8–3,4 m/s, foretrukket 0–3 m/s og fralandsvind; delvis datadækning blev markeret korrekt. Den lokale cachekopi blev fjernet efter QA og er ikke en del af buildet.

## Opfølgning: enklere valg og tydelig profilstatus (26. september 2026, v30)

- Mine Windows viser det valgte hovedforslag og højst to andre muligheder. Det valgte forslag gentages ikke i alternativerne. Resten kan foldes ud, og valg af alternativ ruller tilbage til hovedkortet. Historik er flyttet under alternativerne; vejr-/regeldetaljer er samlet i fold-ud-visning.
- Profilen skelner mellem anonym, logget ind og fejl ved hentning. Login og gemmeknapper vises efter status, gemning låser formularen, og lokal status bliver ved profilen. Genforsøg efter hentefejl bevarer aktuelle valg med besked om, at gemning erstatter tidligere gemte valg.
- Login bruger top-level navigation til Sites' eksisterende signin-route. Profilkladden bevarer også gyldige køretider; ugyldige, ufærdige køretidsfelter invaliderer ikke kladden. Ved udløbet session vises login igen og valgene bevares.
- 45 tests består, herunder opdatering/genindlæsning af en eksisterende profil samt konto-isolation; TypeScript og produktionsbuild består. Ingen produktionsprofiler eller kalenderaftaler ændret. Ægte konto-login → gem → genindlæs er fortsat ikke verificeret. Browser-QA er ikke udført i dette trin: den af Sites krævede control-browser-skill er ikke tilgængelig i denne turns skillkatalog; der er ikke brugt en alternativ browservej.
