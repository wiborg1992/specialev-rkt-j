# Changelog

Alle væsentlige ændringer til projektet dokumenteres her.
Format: `[dato] Hvad · Hvorfor`

---

## 2026-03-02

### START.bat — Genvej-fix
**Ændring:** Erstattet `%USERPROFILE%\Desktop\` med `[Environment]::GetFolderPath('Desktop')` i PowerShell-kommandoen der opretter skrivebordsgenvej.
**Hvorfor:** På maskiner hvor Skrivebordet er synkroniseret til OneDrive (meget almindeligt i virksomhedsmiljøer) ligger det ikke på den hardkodede sti. Den nye metode finder automatisk det rigtige Skrivebord uanset OS-konfiguration.

---

### server.js — System prompt v1 → v2
**Ændring:** Komplet omskrivning af `SYSTEM_PROMPT`.

Tilføjet:
- **Grundfos brand farver** (`#002A5C`, `#0077C8`, `#E8F4FD` m.fl.) med anvendelsesvejledning
- **Pump- og teknisk domæne-briefing** (hydrauliske parametre, pumpetyper, standarder, systemer)
- **Industrielt kontrolpanel** som ny primær visualiseringstype — aktiveres når pumpe, motor, ventil eller frekvensomformer nævnes
  - Tre komponent-skabeloner: Pumpe, Motor, Ventil — med specifikke parametre for hver
  - HMI-inspireret mørkt layout (`#1a1a2a` baggrund)
  - Realistiske placeholder-værdier når ingen tal nævnes i transskriptionen
  - "PROTOTYPE – Ikke tilsluttet live data" badge på alle kontrolpaneler
- **Udvidet liste af visualiseringstyper** (fra 5 til 6, med mere præcise beskrivelser)
- **Footer** på alle outputs: "Genereret af Meeting AI Visualizer · Grundfos"

**Hvorfor:** Den generiske prompt gav for generiske output. Grundfos-konteksten kræver at Claude genkender fagtermer, anvender korrekt branding og genererer HMI-lignende kontrolpaneler der ligner det ingeniørerne arbejder med til daglig.

---

### Dokumentation — Ny (denne session)
**Oprettet:**
- `CONTEXT.md` — projektoverblik, arkitektur, designbeslutninger, kendte begrænsninger
- `PROMPT_LOG.md` — dokumentation af system prompt med rationale for hver sektion
- `TEST_CASES.md` — 6 eksempel-transskriptioner til test og brugertest, med bedømmelseskala
- `CHANGELOG.md` — denne fil

**Hvorfor:** Giver AI-assistenter og udviklere øjeblikkelig kontekst uden at skulle læse al koden. Særligt vigtigt i et specialeprojekt hvor arbejdet sker over mange sessioner.

---

## 2026-03-03

### index.html — Teams-kompatibilitet: "Indsæt tekst"-tilstand
**Ændring:** Tilføjet fane-baseret UI med to tilstande i venstre panel:
- **🎤 Mikrofon** — eksisterende live-transskription via Web Speech API (uændret funktionalitet)
- **📋 Indsæt tekst** — ny tilstand med textarea til at indsætte Teams-transskription, Zoom-referat eller manuelt udkast

Derudover:
- Opdateret browser-fejlmeddelelse til at nævne Edge som alternativ til Chrome
- Begge tilstande kalder samme `/api/visualize` endpoint — ingen backend-ændringer
- Visualisér-knappen fungerer med den aktive tilstands indhold
- Tegnoptælling i indsæt-tilstand
- Vejledning til Teams-brugere direkte i UI'en ("Mere → Start transskription")

**Hvorfor:** Under Teams-møder er mikrofonen ofte låst af Teams-klienten, hvilket forhindrer Web Speech API i at fungere. "Indsæt tekst"-tilstanden løser dette ved at lade brugeren kopiere Teams' egen transskription ind i appen. Desuden er Edge (Chromium-baseret) ligeså kompatibel som Chrome — den gamle fejlmeddelelse var misvisende.

---

## 2026-03-03 (2)

### Teams App Integration — Reel Teams-integration med manifest og SDK
**Ændring:** Fuld Microsoft Teams App-integration implementeret.

Nye filer:
- `teams-manifest/manifest.json` — Teams App manifest med `meetingSidePanel` og `meetingStage` scopes
- `teams-manifest/color.png` — 192×192 app-ikon (Grundfos navy placeholder)
- `teams-manifest/outline.png` — 32×32 outline-ikon (hvid placeholder)
- `teams-manifest/TEAMS_SETUP.md` — trin-for-trin installationsvejledning (ngrok + sideloading)
- `public/config.html` — Teams tab-konfigurationsside (påkrævet af Teams for configurableTabs)

Opdateret `public/index.html`:
- Microsoft Teams JS SDK v2.22.0 loadet via CDN
- Automatisk Teams-kontekst-detektion ved opstart (`microsoftTeams.app.initialize()`)
- Tre layout-tilstande via CSS-klasser:
  - `teams-sidepanel`: Lodret enkelt-kolonne layout, "↗ Del til scene"-knap synlig
  - `teams-stage`: Venstre panel skjult, visualisering fylder hele bredden
  - `teams-content`: Standard layout med TEAMS-badge i topbar
- "↗ Del til scene"-knap (`shareAppContentToStage`) — facilitatoren kan dele visualiseringen til alle mødedeltagere med ét klik
- TEAMS-badge i topbar vises når appen kører inde i Teams

**Hvorfor:** Paste-løsningen fra forrige session fungerer som fallback, men for en rigtig prototypetest hos Grundfos er native Teams-integration afgørende — deltagere skal ikke manuelt kopiere transskription. Med sidePanel-integration og Share to Stage kan én facilitator styre appen mens alle ser resultatet live.

**Krav til brug:** ngrok (gratis) + Teams sideloading. Se `teams-manifest/TEAMS_SETUP.md`.

---

## 2026-03-03 (3)

### server.js + index.html — Støjrobusthed og dansk ASR-kvalitet
**Baggrund:** Gennemgang af AAU-specialeafhandling *"Leveraging NLP for Meeting Transcriptions in Enterprise Settings"* (Danni Hedegaard Dahl, 2026) som dokumenterer udfordringerne med dansk talegenkendelese i rigtige mødemiljøer.

**Centrale fund fra afhandlingen der driver ændringerne:**
- 36 % af rå mødelyd blev kasseret pga. støj, overlap og lav kvalitet
- Dansk tale har specifikke mønstre: øh-pauser, gentagelser ("ja ja ja"), sammensatte ord
- Mikrofonafstand er den **stærkeste enkeltfaktor** for transskriptionskvalitet
- Attention-baserede modeller (som Whisper-arkitekturer) hallucinator ved støjfulde inputs
- Selv de bedste open-source modeller opnår WER ~44 % på rigtige møder

**Ændringer i `server.js` — system prompt:**
- Ny sektion `━━━ STØJROBUSTHED OG DANSK MØDETALE ━━━`
- Claude instrueres i at ignorere fyldeord (øh, altså, ja ja ja), gentagelser og støjartefakter
- Explicitvejledning om sammensatte ord der kan være splittet af ASR (f.eks. "pumpe hus" = "pumpehus")
- Fallback-HTML når input er for kort/uklart (< 8 meningsfulde ord)
- Bilingual support: Grundfos-møder blander dansk og engelsk — Claude håndterer begge naturligt

**Ændringer i `public/index.html` — Web Speech API:**
- `maxAlternatives = 3` — API returnerer nu 3 alternativer, bedste valgt
- **Confidence-filtrering**: resultater med confidence < 0.38 og ≤ 2 ord droppes som støj
- **Fyldeords-filter** (`removeDanishFillers`): isolerede "øh", "altså", "nå men" etc. fjernes
- **Hallucinationsfilter** (`isHallucination`): gentagne fraser (5+ ord, 3+ gange) filtreres
- **Lydkvalitetsindikator**: Grøn/gul/rød bar viser realtids gennemsnitlig confidence
- **Støjadvarsel**: efter 4+ efterfølgende lave resultater vises "⚠️ Lav lydkvalitet"-besked
- **Ryd-knap** til mikrofonpanelet (tidligere manglende)
- Indikatorer nulstilles automatisk ved stop/ryd

**Hvorfor:** Grundfos-møder afholdes i mødelokaler med variabel akustik og støj. Uden filtrering fører dette til at støjord eller gentaget tekst sendes til Claude, som så genererer irrelevante visualiseringer. Med de nye filtre sendes kun meningsfuld tale videre — og Claude er nu instrueret i at håndtere det der alligevel slipper igennem.

---

## Skabelon til fremtidige entries

```
## ÅÅÅÅ-MM-DD

### [Fil] — [Kort titel]
**Ændring:** Hvad blev lavet.
**Hvorfor:** Baggrund og rationale.
```
