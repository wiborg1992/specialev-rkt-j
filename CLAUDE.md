# Meeting AI Visualizer — CLAUDE.md

> Projektets workflow-konfiguration til AI-assistenter (Claude, Cowork).
> Læs denne fil først. Den definerer regler, stack, tilgængelige tools og arbejdsflow.

---

## Projekt

**Navn:** Meeting AI Visualizer
**Formål:** Realtids-transskription og AI-genereret HTML-visualisering til møder hos Grundfos.
**Status:** Aktiv prototype — videreudvikles iterativt.

**Primær fil til at forstå projektet:** `CONTEXT.md`

---

## Tech Stack

| Lag | Teknologi |
|-----|-----------|
| Backend (primær) | Node.js 22+, `server.js` (Express-lignende, ingen tunge deps) |
| Backend (alternativ) | Python, `server.py` |
| Frontend | Vanilla HTML/CSS/JS — ingen frameworks |
| AI | Anthropic API, model: `claude-sonnet-4-6` |
| Transskription | Web Speech API (`da-DK`), kun Chrome/Edge |
| Hosting | Railway (`railway.json`) |
| Design | Grundfos brand (navy `#002A5C`, blå `#0077C8`) |

**Designbeslutning (opdateret):** HTML-output renderes i en `<iframe>` via `contentDocument.write()` under streaming, og via `innerHTML` ved visning af færdigt output. Begge metoder understøtter `<style>`-blokke i moderne Chrome.

**Nuværende SYSTEM_PROMPT output-format:** `<style>/* al CSS øverst */</style><div>/* HTML herunder */</div>` — `<style>`-blokke giver rigere CSS (keyframes, media queries, pseudo-selectors) og foretrækkes frem for inline CSS på hvert element. *(Tidligere dokumenteret som "brug altid inline CSS" — denne begrænsning er ophævet.)*

---

## Tilgængelige Workflow-Tools

### 1. UI/UX Pro Max Skill (AKTIV)

**Brug ALTID denne skill ved UI-opgaver.**

Triggeres automatisk af Cowork ved design-opgaver, men kan også kaldes eksplicit:

```bash
# Generér design system (kør ALTID som første skridt ved UI-arbejde)
python3 ../ui-ux-pro-max-skill/src/ui-ux-pro-max/scripts/search.py \
  "dashboard data visualization dark mode SaaS" --design-system -p "Meeting AI Visualizer"

# Gem design system persistent
python3 ../ui-ux-pro-max-skill/src/ui-ux-pro-max/scripts/search.py \
  "dashboard visualization dark mode" --design-system --persist -p "Meeting AI Visualizer"

# Søg i specifikke domæner
python3 ../ui-ux-pro-max-skill/src/ui-ux-pro-max/scripts/search.py \
  "animation loading" --domain ux

# Brug stack-specifikke guidelines (dette projekt: html-tailwind eller plain HTML)
python3 ../ui-ux-pro-max-skill/src/ui-ux-pro-max/scripts/search.py \
  "responsive layout" --stack html-tailwind
```

**Obligatorisk ved disse opgavetyper:**
- Nye UI-komponenter (knapper, panels, kort, modaler)
- Farvepaletter og typografi
- Layout og responsivitet
- Animationer og loading states
- Accessibility-review
- Design af nye sider eller sektioner i `public/index.html`

**Grundfos-specifikke krav til UI:**
- Primær farve: `#002A5C` (navy)
- Accent: `#0077C8` (blå)
- Kortbaggrund (mørk): `#252535`
- Al HTML-output skal bruge inline CSS
- Prototype-badge skal være synlig for mødedeltagere

---

### 2. Stitch MCP (AKTIV)

Stitch er Googles UI-prototyping tool, koblet via MCP (`@_davideast/stitch-mcp`).

**Konfiguration:** Se `.mcp.json` i projektets rod.

**Brug til:**
- Hurtig UI-prototype af nye skærmbilleder
- Generér HTML-mockups fra designbeskrivelser
- Preview af visualiseringskomponenter

**Verificer forbindelse:**
```bash
npx @_davideast/stitch-mcp doctor --verbose
npx @_davideast/stitch-mcp tool
```

**Dokumentation:** `../stitch-mcp/docs/`

---

### 3. Everything Claude Code — Tilgængelige Commands

Følgende slash-commands er tilgængelige via `.claude/commands/`:

| Command | Brug |
|---------|------|
| `/plan` | Planlæg en ny feature eller ændring |
| `/tdd` | Test-drevet udvikling |
| `/code-review` | Kvalitets- og sikkerhedsgennemgang |
| `/build-fix` | Fix build- eller runtime-fejl |
| `/refactor-clean` | Fjern dead code og ryd op |
| `/learn` | Udtræk mønstre fra sessionen |
| `/checkpoint` | Gem verification state |
| `/verify` | Kør verification loop |
| `/update-docs` | Synkronisér dokumentation |

---

## Workflow-Regler (fra everything-claude-code common/rules)

### Generelt

- **Læs `CONTEXT.md` og `PROMPT_LOG.md` inden du laver ændringer** i server-logik eller AI-prompts.
- **Læs `CHANGELOG.md`** for at forstå hvad der allerede er forsøgt og besluttet.
- **Brug `TEST_CASES.md`** til at validere ændringer i visualiseringslogikken.
- Skriv aldrig over eksisterende filer uden at begrunde det.
- Tilføj altid til `CHANGELOG.md` ved substantielle ændringer.

### Kode

- Prioritér læsbarhed og simplicitet — dette er en prototype.
- Ingen unødvendige dependencies — `package.json` er bevidst minimal.
- Inline CSS i al HTML der genereres af Claude (teknisk krav, se CONTEXT.md).
- Brug `node --watch server.js` til development.

### UI/Design

- **Brug altid UI/UX Pro Max Skill** ved design-relaterede opgaver (se sektion ovenfor).
- Match altid Grundfos brand-farver.
- Alle HTML-visualiseringer skal fungere uden external assets.
- Test i Chrome (primær browser for Web Speech API).

### Git

- Commit-beskeder på dansk eller engelsk.
- Brug præfikser: `feat:`, `fix:`, `refactor:`, `docs:`, `style:`.
- Test altid i browser inden commit.

### Sikkerhed

- `.env` må aldrig committes (allerede i `.gitignore`).
- API-nøgler kun via environment variables.
- Ingen brugerdata lagres (stateless arkitektur).

---

## Mappestruktur (hele Claude-mappen)

```
Desktop/Claude/
├── specialev-rkt-j/          ← DETTE ER HOVEDPROJEKTET
│   ├── CLAUDE.md             ← denne fil
│   ├── CONTEXT.md            ← projektkontekst (læs først)
│   ├── PROMPT_LOG.md         ← AI-prompt dokumentation
│   ├── CHANGELOG.md          ← historik
│   ├── TEST_CASES.md         ← testeksempler
│   ├── server.js             ← Node.js backend
│   ├── server.py             ← Python-alternativ
│   ├── public/index.html     ← frontend
│   ├── .mcp.json             ← Stitch MCP konfiguration
│   ├── .env.example          ← miljøvariabel-skabelon
│   └── .claude/
│       ├── rules/            ← everything-claude-code common rules
│       └── commands/         ← tilgængelige slash-commands
│
├── everything-claude-code/   ← WORKFLOW-FUNDAMENT
│   ├── skills/               ← 65+ skills til brug ved behov
│   ├── commands/             ← 40 commands (fuldt sæt)
│   ├── rules/                ← regler (common + typescript + python)
│   ├── agents/               ← specialiserede agenter
│   ├── hooks/                ← automation hooks
│   └── examples/             ← CLAUDE.md-eksempler
│
├── ui-ux-pro-max-skill/      ← DESIGN SKILL (AKTIV)
│   └── src/ui-ux-pro-max/
│       └── scripts/search.py ← CLI-tool til design system
│
└── stitch-mcp/               ← STITCH MCP REFERENCE
    └── docs/                 ← fuld dokumentation
```

---

## Næste Udviklingsområder

### Umiddelbare (klar til test)
- **Tilføj `ANTHROPIC_API_KEY`** til `.env` — server starter ikke uden den
- **Test TC-01** med `test-viz-tc01.html` som reference — åbn filen i Chrome, kør derefter live test
- Validering med rigtige Grundfos-transskriptioner

### Kommende features (fra `CONTEXT.md`)
- Stitch runtime integration i `server.js` (aftalt under Mulighed B)
- Gem/eksport-funktion
- Historik over visualiseringer i session
- Hosting til brug på tværs af enheder (ngrok eller Railway)
- Justerbart auto-visualiserings-interval

---

## Hurtig Start (development)

```bash
# Kopiér miljøvariabler
cp .env.example .env
# Tilføj din ANTHROPIC_API_KEY i .env

# Start server
npm run dev
# eller
node --watch server.js

# Åbn i Chrome
# http://localhost:3000
```
