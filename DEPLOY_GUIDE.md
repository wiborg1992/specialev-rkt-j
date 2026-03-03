# Deployment Guide — Railway + Teams App Catalog

Denne guide gør appen tilgængelig for alle Grundfos-brugere i Teams som en rigtig organisations-app — ingen ZIP-filer, ingen teknisk opsætning for slutbrugerne.

**Overblik:** Du deployer appen til Railway (gratis, ~5 min) → sender én ZIP-fil til Grundfos IT → de uploader den til Teams Admin Center → appen er synlig for alle.

---

## Del 1 — Deploy til Railway

### Forudsætninger
- En GitHub-konto (gratis)
- En Railway-konto (gratis) — opret på https://railway.app med GitHub-login

---

### Trin 1 — Læg projektet på GitHub

Gå til https://github.com/new og opret et nyt **privat** repository (f.eks. `meeting-ai-visualizer`).

Åbn en terminal i projektmappen og kør:
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/DIT-BRUGERNAVN/meeting-ai-visualizer.git
git push -u origin main
```

> `.env`-filen (med API-nøglen) uploades IKKE — den er i `.gitignore`. API-nøglen sættes i Railway i næste trin.

---

### Trin 2 — Opret Railway-projekt

1. Gå til https://railway.app og log ind med GitHub
2. Klik **New Project** → **Deploy from GitHub repo**
3. Vælg dit `meeting-ai-visualizer` repository
4. Railway registrerer automatisk Node.js og starter deployment

---

### Trin 3 — Tilføj API-nøgle som miljøvariabel

1. Klik på dit projekt i Railway → fanen **Variables**
2. Tilføj:

| Variable | Værdi |
|---|---|
| `ANTHROPIC_API_KEY` | Din nøgle fra https://console.anthropic.com |

3. Railway genstarter automatisk appen

---

### Trin 4 — Få din stabile URL

1. Gå til fanen **Settings** → **Networking**
2. Klik **Generate Domain**
3. Du får en URL som: `meeting-ai-visualizer.up.railway.app`

Test at appen virker ved at åbne URL'en i Chrome eller Edge.

---

### Trin 5 — Opdater manifest.json

Åbn `teams-manifest/manifest.json` og erstat alle tre steder:

| Find | Erstat med |
|---|---|
| `REPLACE_WITH_BASE_URL` | `https://meeting-ai-visualizer.up.railway.app` |
| `REPLACE_WITH_DOMAIN` | `meeting-ai-visualizer.up.railway.app` |
| `REPLACE_WITH_GUID` | Et GUID fra https://guidgenerator.com |

---

### Trin 6 — Pak manifest-ZIP

Markér disse tre filer i `teams-manifest/`-mappen (ikke selve mappen):
- `manifest.json`
- `color.png`
- `outline.png`

Højreklik → Komprimer til ZIP → kald den `meeting-ai-grundfos.zip`.

---

## Del 2 — Grundfos IT uploader til Teams Admin Center

Send `meeting-ai-grundfos.zip` og `IT_ADMIN_GUIDE.md` til Grundfos' Teams-administrator.

De skal bruge **ca. 2 minutter** på at uploade appen. Herefter er den synlig for alle Grundfos-brugere under "Tilføjet af din organisation" i Teams.

---

## Del 3 — Slutbrugerens oplevelse

Når appen er i kataloget gør brugerne følgende — én gang:

1. Åbn Teams → **Apps** (venstre menu)
2. Søg efter **"Meeting AI"**
3. Klik **Tilføj til et møde**

I selve mødet:
- Appen åbner i **sidepanelet** til højre
- Klik **↗ Del til scene** for at vise visualiseringen for alle deltagere
- Brug **Mikrofon**-fanen til live-transskription eller **Indsæt tekst** til Teams' egen transskription

---

## Vigtige noter om online drift

**Mødehistorik**: Railway's filsystem er ephemeral — gemte møder slettes ved redeploy. Det er en gratis Railway-begrænsning. Rum og live-transkription fungerer normalt. Vil du have persistent historik, tilføj en Railway Volume eller en gratis database (se railway.app/docs/databases).

**Node.js version**: Projektet kræver Node.js 22+ (for native fetch og streams). Railway bruger Nixpacks som automatisk detecter dette fra `package.json`'s `engines`-felt.

**API-forbrug**: Hvert "Visualisér"-klik bruger ca. 2.000–8.000 Claude API-tokens. Med claude-sonnet-4-6 svarer det til ca. 0,01–0,03 USD per visualisering.

---

## Vedligeholdelse

| Handling | Hvad der sker |
|---|---|
| Push kode til GitHub | Railway re-deployer automatisk |
| Ændring i system prompt | Push til GitHub → automatisk live inden for ét minut |
| Nyt GUID / ny URL | Opdater manifest.json → ny ZIP → send til IT igen |
| API-nøgle udløber | Opdater `ANTHROPIC_API_KEY` i Railway Variables |
