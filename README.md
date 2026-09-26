# Window — selvstændig Cloudflare-udgave

Migreringskandidat fra Window version 30 (kildecommit `3d96916ab1ae92bb6adb580651afc5478af2ef9f`). Den eksisterende Sites-side er ikke ændret. Denne kopi er **ikke udgivet** og har ingen produktionsdatabase eller rigtige login-nøgler endnu.

## Hvad er flyttet?

Hele kildekoden, designet, spots, prognosemotoren, statiske historiske datasæt, profil, turplanlægning, kalender- og pushkode er med. ChatGPT/Sites-login og hostingplugin er erstattet med Clerk og egen Cloudflare-konfiguration. Brugerne logger ind på `/sign-in`, opretter konto på `/sign-up` og finder konto/log ud på `/account`.

Private databaseposter, aktive sessioner, Google-tokens, browser-pushabonnementer og hostinghemmeligheder er **ikke** kopieret. Se `MIGRATION.md`.

## Konti, der mangler

1. Ejerens GitHub-repository (privat anbefales til opsætningen).
2. Ejerens Cloudflare-konto med Workers og D1.
3. En Clerk-applikation. Aktivér e-mailkode og evt. Google i Clerk Dashboard.

Et eget domæne er ikke påkrævet for første test: Cloudflare kan give en `workers.dev`-adresse. Clerk development keys kan bruges til den midlertidige testadresse; endelig produktion bør bruge Clerk production instance og eget domæne efter Clerks domæneopsætning. Nøgler må aldrig sendes i chat eller lægges i Git.

## Lokal opstart

Kræver Node 22.13+ og pnpm.

```sh
pnpm install --frozen-lockfile
cp .env.example .env.local
cp .dev.vars.example .dev.vars
pnpm db:migrate:local
pnpm dev
```

Uden Clerk-nøgler fungerer de offentlige skærme; login viser, at opsætningen mangler. For login sættes samme Clerk publishable key i `.env.local` (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`) og `.dev.vars` (`CLERK_PUBLISHABLE_KEY`). Sæt også `CLERK_SECRET_KEY` og evt. `CLERK_JWT_KEY` (PEM public key) i `.dev.vars`. Brug `http://localhost:5173` som origin begge steder.

## Udgivelse på egen Cloudflare

```sh
pnpm exec wrangler login
pnpm exec wrangler d1 create window
```

Kopiér det **returnerede** database-id til `wrangler.jsonc`. Opret `.env.production` ud fra `.env.example`, og sæt den faktiske adresse, Clerk publishable key og `CLOUDFLARE_ACCOUNT_ID`. Sæt nøjagtigt samme adresse som `APP_ORIGIN` og samme publishable key som `CLERK_PUBLISHABLE_KEY` i `wrangler.jsonc`.

Gem hemmeligheder sikkert med Wrangler (interaktivt input):

```sh
pnpm exec wrangler secret put CLERK_SECRET_KEY
pnpm exec wrangler secret put CLERK_JWT_KEY
pnpm db:migrate:remote
pnpm deploy
```

`pnpm deploy` stopper ved tomme nøgler, standarddatabase-id eller forskellige origins. Den kontrollerer ikke fjernhemmeligheder; de skal sættes før login testes. Første deploy kan kræve, at Worker-navnet reserveres i Cloudflare Dashboard, inden secrets tilføjes.

## Kontrol før skift

```sh
pnpm exec tsc --noEmit
pnpm test
pnpm build
```

Test derefter på den faktiske nye adresse: anonym søgning → opret konto → bekræft e-mail → gem profil → genindlæs → log ud → log ind → samme profil. Brug også to testkonti for isolation. OAuth-callback, push og Clerk browser-cookie-handshake kræver rigtig konfiguration og er endnu ikke testet ende til ende.

De automatiske tests omfatter signeret session, afvist forkert signatur/udløb/anden origin, afvisning af gamle OpenAI-identitetsheaders, profilsøgning og konto-isolation.

## Kalender og notifikationer

Google OAuth skal have den nye callbackadresse `${APP_ORIGIN}/api/calendar/google-callback`. Sæt `GOOGLE_CALENDAR_CLIENT_ID`, `GOOGLE_CALENDAR_CLIENT_SECRET` og en ny 64-tegns hex `CALENDAR_TOKEN_KEY` som Worker-secrets. Eksisterende brugere skal forbinde kalenderen igen.

Push kræver nye VAPID-nøgler, en 64-tegns hex `PUSH_STORAGE_KEY`, `PUSH_JOB_SECRET` og et **separat opsat** planlagt job, som kalder `POST /api/push/check` med den hemmelige Bearer-værdi. Koden medleverer ikke et aktiveret cronjob. `PUSH_SCHEDULER_ENABLED` må først sættes til `true`, når jobbet er verificeret. Brugere skal aktivere notifikationer på den nye origin igen.

## Fortsat udvikling

Opret ejerens repository og upload denne mappe. Ingen `.env*`, `.dev.vars`, nøgler eller databaseeksporter må komme med; eksempel-filerne er tilsigtet. Når repository og Cloudflare-adgang er forbundet, kan arbejdet fortsætte fra dette projekt. Undgå at uploade `node_modules`, `dist` eller `.wrangler`.
