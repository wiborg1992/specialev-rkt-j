# Teams App Opsætning — Trin-for-trin

Denne guide beskriver hvordan Meeting AI Visualizer installeres som en rigtig Teams-app til brug i møder.

---

## Forudsætninger

- Node.js installeret (til at køre serveren)
- En Anthropic API-nøgle i `.env`
- **ngrok** installeret — bruges til at gøre localhost tilgængeligt fra Teams
  - Download: https://ngrok.com/download (gratis tier er nok til prototype)
- Teams-adgang med mulighed for at sideloade apps (kræver ikke admin-rettigheder i de fleste Grundfos-tenants)

---

## Trin 1 — Start serveren

Dobbeltklik på `START.bat` i projektmappen.
Serveren kører nu på `http://localhost:3000`.

---

## Trin 2 — Åbn en offentlig tunnel med ngrok

Åbn en ny terminal og kør:
```
ngrok http 3000
```

ngrok viser nu en linje som:
```
Forwarding   https://abc123.ngrok-free.app -> http://localhost:3000
```

Kopiér denne URL (f.eks. `https://abc123.ngrok-free.app`) — det er din `BASE_URL`.

---

## Trin 3 — Opdater manifest.json

Åbn `teams-manifest/manifest.json` og erstat alle tre steder:

| Find | Erstat med |
|---|---|
| `REPLACE_WITH_BASE_URL` | din ngrok URL, f.eks. `https://abc123.ngrok-free.app` |
| `REPLACE_WITH_DOMAIN`   | kun domænet, f.eks. `abc123.ngrok-free.app` |
| `REPLACE_WITH_GUID`     | et unikt GUID — generér ét på https://guidgenerator.com |

Eksempel på udfyldt manifest:
```json
"id": "550e8400-e29b-41d4-a716-446655440000",
"websiteUrl": "https://abc123.ngrok-free.app",
"configurationUrl": "https://abc123.ngrok-free.app/config.html",
"contentUrl": "https://abc123.ngrok-free.app/index.html",
"validDomains": ["abc123.ngrok-free.app"]
```

---

## Trin 4 — Pak manifest-filerne som ZIP

Zip de tre filer i `teams-manifest/`-mappen (IKKE selve mappen — kun indholdet):
- `manifest.json`
- `color.png`
- `outline.png`

På Windows: Markér de tre filer → Højreklik → Komprimer til ZIP-fil.

Kald ZIP-filen f.eks. `meeting-ai-teams.zip`.

---

## Trin 5 — Sideload appen i Teams

1. Åbn Microsoft Teams
2. Klik på **Apps** (venstre menu, nederst)
3. Klik på **Administrer dine apps** → **Upload en app**
4. Vælg **Upload en tilpasset app**
5. Vælg din `meeting-ai-teams.zip`
6. Klik **Tilføj**

---

## Trin 6 — Brug appen i et møde

### Som sidepanel:
1. Start eller åbn et Teams-møde
2. Klik på **+** (Tilføj en app) i møde-toolbar
3. Find **Meeting AI** og tilføj den
4. Appen åbner i sidepanelet — start transskription eller indsæt tekst

### Del til scene (alle deltagere ser det):
1. Klik **↗ Del til scene** i appens topbar
2. Visualiseringen vises nu på stor skærm for alle mødedeltagere
3. Kun facilitatoren styrer appen — øvrige deltagere ser den seneste visualisering

---

## Bemærkninger til prototype-test

- **ngrok-URL'en skifter** hver gang ngrok genstartes med gratis konto — du skal opdatere manifest.json og geninstallere appen.
  - Løsning: Brug `ngrok http 3000 --subdomain=grundfos-meeting-ai` med betalt ngrok, eller host appen permanent.
- **Sideloading** kræver normalt ikke admin-godkendelse til test, men din organisations Teams-politik kan blokere det.
  - Kontakt IT hvis du får fejlen "Din organisation tillader ikke upload af brugerdefinerede apps".
- **Ikonerne** (color.png, outline.png) er simple farvede placeholdre — erstat dem med rigtige Grundfos-ikoner til den endelige version.
