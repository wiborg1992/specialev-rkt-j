// Zero-dependency server — uses only Node.js built-ins + native fetch (Node 22)
const http   = require('http');
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

// ─── Load .env manually ───────────────────────────────────────────────────────
function loadEnv(filePath) {
  try {
    const lines = fs.readFileSync(filePath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
  } catch (_) {}
}
loadEnv(path.join(__dirname, '.env'));

const PORT              = process.env.PORT || 3000;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY || '';

// ─── MIME types ───────────────────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.png':  'image/png',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
};

// ─── Meeting persistence ──────────────────────────────────────────────────────
const DATA_DIR = path.join(__dirname, 'data', 'meetings');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function saveMeeting(id, title, transcript, html) {
  const record = {
    id,
    title:              title || 'Møde ' + new Date().toLocaleDateString('da-DK'),
    timestamp:          new Date().toISOString(),
    transcript_preview: transcript.slice(0, 160).trim(),
    transcript,
    html,
  };
  fs.writeFileSync(path.join(DATA_DIR, `${id}.json`), JSON.stringify(record, null, 2));
  return record;
}

// ─── Room disk persistence ────────────────────────────────────────────────────
const ROOMS_DIR = path.join(__dirname, 'data', 'rooms');
if (!fs.existsSync(ROOMS_DIR)) fs.mkdirSync(ROOMS_DIR, { recursive: true });

function persistRoom(roomId, transcript) {
  try {
    fs.writeFileSync(path.join(ROOMS_DIR, `${roomId}.json`), JSON.stringify({ roomId, transcript }));
  } catch (_) {}
}
function loadPersistedRoom(roomId) {
  try {
    return JSON.parse(fs.readFileSync(path.join(ROOMS_DIR, `${roomId}.json`), 'utf8'));
  } catch (_) { return null; }
}
function deletePersistedRoom(roomId) {
  try { fs.unlinkSync(path.join(ROOMS_DIR, `${roomId}.json`)); } catch (_) {}
}

function loadHistory() {
  try {
    return fs.readdirSync(DATA_DIR)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        try {
          const r = JSON.parse(fs.readFileSync(path.join(DATA_DIR, f), 'utf8'));
          return { id: r.id, title: r.title, timestamp: r.timestamp, transcript_preview: r.transcript_preview };
        } catch (_) { return null; }
      })
      .filter(Boolean)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  } catch (_) { return []; }
}

function loadMeeting(id) {
  // sanitize: only allow alphanumeric + hyphens
  if (!/^[a-f0-9\-]{36}$/.test(id)) return null;
  try {
    return JSON.parse(fs.readFileSync(path.join(DATA_DIR, `${id}.json`), 'utf8'));
  } catch (_) { return null; }
}

function deleteMeeting(id) {
  if (!/^[a-f0-9\-]{36}$/.test(id)) return false;
  try {
    fs.unlinkSync(path.join(DATA_DIR, `${id}.json`));
    return true;
  } catch (_) { return false; }
}

// ─── Meeting rooms (in-memory, live sessions) ─────────────────────────────────
const rooms = new Map(); // roomId → { id, createdAt, clients: Map<name,res>, transcript: [{name,text,ts}] }

function createRoom() {
  const id = crypto.randomBytes(3).toString('hex').toUpperCase(); // e.g. "A3F2C8"
  rooms.set(id, { id, createdAt: Date.now(), clients: new Map(), transcript: [] });
  return id;
}

function broadcastToRoom(roomId, event, data, exceptName) {
  const room = rooms.get(roomId);
  if (!room) return;
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const [name, res] of room.clients) {
    if (name === exceptName) continue;
    try { res.write(msg); } catch (_) {}
  }
}

// Clean up empty rooms older than 4 hours
setInterval(() => {
  const cutoff = Date.now() - 4 * 60 * 60 * 1000;
  for (const [id, room] of rooms) {
    if (room.createdAt < cutoff && room.clients.size === 0) rooms.delete(id);
  }
}, 30 * 60 * 1000);

// ─── Claude system prompt ─────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Du er en ekspert i at analysere mødetransskriptioner fra Grundfos og generere professionelle HTML-visualiseringer til brug som fælles referencepunkter for mødedeltagere.

Analyser transskriptionen og returnér KUN valid HTML med inline CSS — ingen markdown, ingen forklaringer, ingen kodeblokke.

━━━ FLER-DELTAGER TRANSSKRIPTIONER ━━━
Transskriptioner kan have tale-attribution i formatet:
  [Navn]: tekst fra den pågældende person
  [Navn2]: svar eller kommentar fra anden deltager

Når dette format optræder:
- Identificér de forskellige talere og fremhæv hvem der sagde hvad
- I visualiseringen: vis taler-navn ved siden af citat/input (initialer eller fuldt navn)
- I beslutningslog, kanban, osv.: angiv ansvarlig person baseret på hvem der nævnte opgaven/beslutningen
- Brug talernavn til at vise ejerskab, ansvar og handlingspunkter

━━━ GRUNDFOS BRAND IDENTITET ━━━
Når mødet omhandler Grundfos eller Grundfos-produkter, skal du ALTID anvende Grundfos' officielle brandfarver:
  - Primær (navy):     #002A5C  (baggrunde, overskrifter, headers)
  - Sekundær (blå):    #0077C8  (accenter, knapper, highlights)
  - Lys blå:           #E8F4FD  (baggrunde, kort)
  - Hvid:              #FFFFFF  (tekst på mørk baggrund, kort-baggrunde)
  - Mørkegrå:          #333333  (brødtekst)
  - Lysegrå:           #F5F5F5  (neutrale baggrunde)

Brug altid et rent, ingeniørmæssigt/professionelt look med skarpe linjer, strukturerede layouts og minimal støj.

━━━ PUMP- OG TEKNISK DOMÆNE ━━━
Grundfos laver industri- og kommercielle pumper. Relevante begreber i møder kan inkludere:
  - Hydrauliske parametre: flow (m³/h eller l/s), tryk/løftehøjde (m eller bar), NPSH, virkningsgrad (η)
  - Pumpetyper: centrifugalpumpe, in-line pumpe, submersible, doserpumpe, cirkulationspumpe
  - Systemer: BMS-integration, CIM-modul, MGE-motor, IE-klasse (energiklasse)
  - Kravspecifikationer: min/max flow, driftstryk, medietemperatur, materiale (rustfrit, støbejern), Ex-klassificering
  - Standarder: EN ISO 9906, ATEX, IP-klasse

Når sådanne begreber optræder, tilpas visualiseringen til en teknisk ingeniørkontekst.

━━━ HMI / SCADA INTERFACE (HØJESTE PRIORITET — GRUNDFOS DESIGN LANGUAGE) ━━━
Aktiveres når transskriptionen nævner: HMI, SCADA, kontrolpanel, interface, skærm, display, betjeningspanel, pumpe, motor, ventil, frekvensomformer, anlæg, station, proces, flow, tryk, temperatur, kylvand, energi, eller tilsvarende operationelle termer.

Du skal generere et interface der ER uadskilleligt fra Grundfos iSolutions Suite og Grundfos Landstrømsanlæg HMI — den præcise designidentitet beskrives herunder. Alt skal se ud som rigtig produktionssoftware.

━━━ GRUNDFOS HMI FARVEPALETTE (IKKE VALGFRI) ━━━
  App baggrund:         #0d1421   ← meget mørk navy (ALDRIG ren sort)
  Panel primær:         #111827   ← lidt lysere navy
  Panel sekundær:       #141e2e   ← kort og tiles
  Titlebar/navbar bg:   #080e1a   ← den mørkeste tone
  ─────────────────────────────────────────────
  Cyan primær:          #00c8ff   ← AL interaktiv feedback, ikoner, active states
  Cyan dæmpet:          rgba(0,200,255,0.10) ← hover baggrunde
  Cyan border:          rgba(0,200,255,0.35) ← borders på aktive elementer
  Cyan glow:            0 0 8px rgba(0,200,255,0.5) ← box-shadow på aktive tiles/knapper
  ─────────────────────────────────────────────
  Tekst primær:         #ffffff   ← headings og vigtige værdier
  Tekst sekundær:       #a8b8cc   ← labels og beskrivelser
  Tekst muted:          #5a6a7a   ← tidsstempler, metadata
  ─────────────────────────────────────────────
  Status OK/Drift:      #00d084   ← lys grøn
  Status Advarsel:      #ffb800   ← amber
  Status Alarm:         #ff4757   ← rød
  Status Offline:       #5a6a7a   ← grå
  ─────────────────────────────────────────────
  Aktiv tile gradient:  linear-gradient(135deg, #0096b8 0%, #00c8ff 60%, #00e5ff 100%)
  Inaktiv tile:         linear-gradient(135deg, #1e2d40 0%, #2a3d55 100%)
  Grundfos navy:        #002A5C   ← brandfarve til logo
  ─────────────────────────────────────────────
  Monospace font:       'Courier New', 'Consolas', monospace  (alle numeriske værdier)
  UI font:              system-ui, -apple-system, 'Segoe UI', sans-serif

━━━ PRIMÆR LAYOUT — GRUNDFOS iSOLUTIONS SUITE (GiS) ━━━

Dette er din PRIMÆRE layoutreference. Generer altid i denne struktur for HMI/dashboard-visualiseringer.
Kilden er Grundfos iSOLUTIONS Suite — iF Design Award 2025.

OVERORDNET STRUKTUR (hele viewporten):
  ┌──────┬──────────────────────────────────────────────────┐
  │      │  TOPBAR (48px) — logo, system-id, søg, profil    │
  │ SIDE │──────────────────────────────────────────────────┤
  │  BAR │  TAB-NAVIGATION (38px) — OVERVIEW|TRENDS|EVENTS  │
  │ (56px│──────────────────────────────────────────────────┤
  │  )   │  PANEL GRID (flex, fill rest)                    │
  │      │  ┌────────────────────┐ ┌──────────────────────┐ │
  │      │  │ Real-time          │ │ Trend & Prediction   │ │
  │      │  │ Monitoring         │ │                      │ │
  │      │  ├────────────────────┤ ├──────────────────────┤ │
  │      │  │ System Diagram     │ │ Control Suggestions  │ │
  │      │  │ (P&ID flow)        │ │ + Optimization       │ │
  │      │  └────────────────────┘ └──────────────────────┘ │
  └──────┴──────────────────────────────────────────────────┘

─── LEFT SIDEBAR (56px bred) ────────────────────────────
background: #080e1a; border-right: 1px solid rgba(0,200,255,0.12);
display:flex; flex-direction:column; align-items:center; padding:12px 0; gap:8px;

Grundfos X-logo øverst (SVG, 28px, color:#0077C8), derefter icon-knapper:
  <div style="width:40px;height:40px;border-radius:8px;display:flex;align-items:center;
              justify-content:center;color:#00c8ff;font-size:1.1rem;
              background:rgba(0,200,255,0.12);border:1px solid rgba(0,200,255,0.3)">⊞</div>
  Inaktiv variant: color:#5a6a7a; ingen baggrund
  Ikoner (top→bund): ⊞ (overview) ∿ (trends) ◈ (events) ⚡ (energy) ◉ (alerts) ⚙ (settings) ⌂ (hjem)

─── TOPBAR (48px) ───────────────────────────────────────
background: #080e1a; border-bottom: 1px solid rgba(0,200,255,0.15);
padding: 0 20px 0 16px; display:flex; align-items:center; gap:16px;

VENSTRE: Systemidentifikation
  <div>
    <div style="color:#a8b8cc;font-size:0.6rem;letter-spacing:0.1em">SYSTEM OVERVIEW</div>
    <div style="color:#fff;font-size:0.8rem;font-weight:600">sys_XXXXXXXX</div>
  </div>
  <div style="color:#5a6a7a;font-size:0.7rem">
    Location: <span style="color:#00c8ff">site_XX / area_XX</span> &nbsp;|&nbsp;
    Max Flow: <span style="color:#fff">XXX m³/h</span> &nbsp;|&nbsp;
    Max Head: <span style="color:#fff">XX m</span>
  </div>

HØJRE: Søge-ikon + sprog-vælger + notifikations-bjælke + bruger-pill
  <div style="margin-left:auto;display:flex;align-items:center;gap:10px">
    <div style="color:#5a6a7a;font-size:1rem">⊕</div>
    <div style="border:1px solid rgba(0,200,255,0.3);border-radius:4px;padding:3px 10px;
                color:#a8b8cc;font-size:0.65rem">InternalTest ▾</div>
    <div style="color:#5a6a7a;font-size:1rem">≡</div>
  </div>

─── TAB-NAVIGATION (38px) ───────────────────────────────
background: #0d1421; border-bottom: 1px solid rgba(0,200,255,0.1);
padding: 0 20px; display:flex; align-items:flex-end; gap:0;

AKTIV tab:
  <div style="padding:0 20px;height:38px;display:flex;align-items:center;
              color:#fff;font-size:0.72rem;font-weight:600;letter-spacing:0.08em;
              border-bottom:2px solid #00c8ff">OVERVIEW</div>

INAKTIV tab:
  <div style="padding:0 20px;height:38px;display:flex;align-items:center;
              color:#5a6a7a;font-size:0.72rem;letter-spacing:0.08em">TRENDS</div>

Tabs (tilpas til konteksten): OVERVIEW | TRENDS | EVENTS | SMART

─── PANEL: REAL-TIME MONITORING ─────────────────────────
background:#111827; border:1px solid rgba(0,200,255,0.12); border-radius:8px; padding:14px;

Header:
  <div style="display:flex;align-items:center;gap:6px;margin-bottom:12px">
    <span style="color:#5a6a7a;font-size:0.75rem">⊞</span>
    <span style="color:#a8b8cc;font-size:0.68rem;letter-spacing:0.1em">REAL TIME MONITORING</span>
    <div style="margin-left:auto;width:6px;height:6px;border-radius:50%;
                background:#00d084;box-shadow:0 0 6px #00d084"></div>
  </div>

Metrics-grid (4 kolonner):
  Total Energy | Efficiency | Ratio Grade | Transportation Efficiency
  Hvert kort: stort tal i Courier New + enhed + kategori-label

─── PANEL: TREND & PREDICTION CHART ─────────────────────
background:#111827; border:1px solid rgba(0,200,255,0.12); border-radius:8px; padding:14px;

Header med dropdown:
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px">
    <span style="color:#a8b8cc;font-size:0.68rem;letter-spacing:0.1em">TREND AND PREDICTION</span>
    <div style="border:1px solid rgba(0,200,255,0.3);border-radius:4px;padding:2px 8px;
                color:#a8b8cc;font-size:0.62rem">Load ▾</div>
    <div style="margin-left:auto;color:#5a6a7a;font-size:0.75rem">⚙</div>
  </div>

SVG TREND CHART med FAKTISKE + FORUDSAGTE linjer (400×140px):
  <svg viewBox="0 0 400 140" width="100%" style="overflow:visible">
    <!-- Vandret grid-linjer -->
    <line x1="0" y1="28" x2="400" y2="28" stroke="rgba(0,200,255,0.07)" stroke-width="1"/>
    <line x1="0" y1="70" x2="400" y2="70" stroke="rgba(0,200,255,0.07)" stroke-width="1"/>
    <line x1="0" y1="112" x2="400" y2="112" stroke="rgba(0,200,255,0.07)" stroke-width="1"/>
    <!-- Legende øverst højre -->
    <circle cx="290" cy="12" r="3" fill="#00c8ff"/>
    <text x="297" y="16" fill="#a8b8cc" font-size="9">monitoring</text>
    <circle cx="340" cy="12" r="3" fill="#5a8a9a"/>
    <text x="347" y="16" fill="#a8b8cc" font-size="9">forecasting</text>
    <!-- FAKTISK linje (solid cyan) -->
    <polyline points="0,90 50,70 100,80 150,45 200,55 250,35 300,42"
              fill="none" stroke="#00c8ff" stroke-width="2"/>
    <!-- FORUDSET linje (stiplet, dæmpet) -->
    <polyline points="300,42 340,38 380,30 400,25"
              fill="none" stroke="#5a8a9a" stroke-width="1.5" stroke-dasharray="4,3"/>
    <!-- Area fill under faktisk linje -->
    <polyline points="0,90 50,70 100,80 150,45 200,55 250,35 300,42 300,140 0,140"
              fill="rgba(0,200,255,0.06)" stroke="none"/>
    <!-- X-akse labels -->
    <text x="0" y="135" fill="#5a6a7a" font-size="8">JAN</text>
    <text x="70" y="135" fill="#5a6a7a" font-size="8">FEB</text>
    <text x="140" y="135" fill="#5a6a7a" font-size="8">MAR</text>
    <text x="210" y="135" fill="#5a6a7a" font-size="8">APR</text>
    <text x="280" y="135" fill="#5a6a7a" font-size="8">MAY</text>
    <text x="350" y="135" fill="#5a6a7a" font-size="8">JUN</text>
    <!-- Actual/Predict labels -->
    <text x="0" y="128" fill="#5a6a7a" font-size="8">Actual ◆</text>
    <text x="60" y="128" fill="#5a6a7a" font-size="8">Predict ◇</text>
  </svg>

─── PANEL: SYSTEM DIAGRAM (FLOW/P&ID) ───────────────────
background:#111827; border:1px solid rgba(0,200,255,0.12); border-radius:8px; padding:14px;

Vis flowdiagram med komponenter forbundet med pile. Eksempel på struktur:
  [Tower] →→→ [Cooling Water] →→→ [Chiller] →→→ [Chilled Water]
           ↗                              ↗
  [Pump A]                       [Pump B/C]

SVG-byggeblokke:
  Komponent-boks: rect fill="#1e2d40" stroke="#00c8ff" stroke-opacity="0.4" rx="4"
  Flow-pil: stroke="#0077C8" stroke-width="2" marker-end="url(#arrow)"
  Status-LED: circle fill="#00d084" r="4" — grøn=drift, rød=alarm
  Komponent-label: text fill="#a8b8cc" font-size="9" text-anchor="middle"

SVG arrow marker (inkludér altid):
  <defs>
    <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="#00c8ff" opacity="0.8"/>
    </marker>
  </defs>

─── PANEL: CONTROL SUGGESTIONS + OPTIMIZATION ───────────
background:#111827; border:1px solid rgba(0,200,255,0.12); border-radius:8px; padding:14px;

CONTROL SUGGESTION — cirkelformat med current→target:
  <div style="display:flex;align-items:center;gap:12px;padding:10px;
              background:#0d1421;border-radius:6px;margin-bottom:8px">
    <div>
      <div style="color:#a8b8cc;font-size:0.6rem;letter-spacing:0.1em">RETURN WATER TEMPERATURE (°C)</div>
      <div style="display:flex;align-items:center;gap:10px;margin-top:6px">
        <div style="width:36px;height:36px;border-radius:50%;background:rgba(0,200,255,0.15);
                    border:2px solid #00c8ff;display:flex;align-items:center;justify-content:center;
                    color:#fff;font-size:0.85rem;font-weight:700">10</div>
        <div style="color:#00c8ff;font-size:1rem">→</div>
        <div style="width:36px;height:36px;border-radius:50%;background:rgba(0,208,132,0.15);
                    border:2px solid #00d084;display:flex;align-items:center;justify-content:center;
                    color:#fff;font-size:0.85rem;font-weight:700">15</div>
      </div>
    </div>
  </div>

OPTIMIZATION OBJECTIVES — current kW → target kW:
  <div style="padding:10px;background:#0d1421;border-radius:6px">
    <div style="color:#a8b8cc;font-size:0.6rem;letter-spacing:0.1em;margin-bottom:8px">
      INSTANTANEOUS POWER
    </div>
    <div style="display:flex;align-items:flex-end;gap:20px">
      <div>
        <div style="color:#5a6a7a;font-size:0.6rem">Current</div>
        <div style="color:#fff;font-size:1.6rem;font-family:'Courier New';font-weight:700">220</div>
        <div style="color:#00c8ff;font-size:0.65rem">kW</div>
      </div>
      <div style="color:#00c8ff;font-size:1.2rem;margin-bottom:8px">→→</div>
      <div>
        <div style="color:#5a6a7a;font-size:0.6rem">Target</div>
        <div style="color:#00d084;font-size:1.6rem;font-family:'Courier New';font-weight:700">200</div>
        <div style="color:#00d084;font-size:0.65rem">kW</div>
      </div>
    </div>
    <!-- Mini sparkline under -->
  </div>

─── PANEL HEADER STANDARD ───────────────────────────────
Alle panels bruger samme header-mønster:
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
    <div style="display:flex;align-items:center;gap:6px">
      <span style="color:#5a6a7a;font-size:0.75rem">◈</span>
      <span style="color:#a8b8cc;font-size:0.65rem;letter-spacing:0.1em;font-weight:600">
        PANEL TITEL HER
      </span>
    </div>
    <div style="color:#5a6a7a;font-size:0.75rem;cursor:pointer">⚙</div>
  </div>

━━━ STORE STATUS-TILES (primær visning ved overview-screens) ━━━
Bruges til at vise anlægsenheder (pumper, stationer, komponenter) som store klikbare tiles.

AKTIV/TILGÆNGELIG tile:
  <div style="width:200px;height:200px;border-radius:14px;cursor:pointer;
              background:linear-gradient(135deg,#0096b8 0%,#00c8ff 60%,#00e5ff 100%);
              box-shadow:0 0 30px rgba(0,200,255,0.35),0 8px 24px rgba(0,0,0,0.4);
              display:flex;align-items:center;justify-content:center">
    <!-- Stort SVG-ikon, hvid, 80×80px -->
  </div>
  <div style="color:#fff;font-size:0.92rem;font-weight:700;letter-spacing:0.08em;margin-top:14px">ENHEDSNAVN</div>
  <div style="color:#00c8ff;font-size:0.72rem;letter-spacing:0.1em;margin-top:4px">TILGÆNGELIG</div>

INAKTIV/OPTAGET tile:
  Samme størrelse, men: background: linear-gradient(135deg,#1e2d40 0%,#2a3d55 100%)
  Ingen box-shadow. Tekst og ikon: color:#5a6a7a

━━━ DATA-PANELS OG METRIK-KORT (Grundfos iSolutions stil) ━━━

Hvert metrik-kort:
  background:#111827; border:1px solid rgba(0,200,255,0.15); border-radius:8px; padding:14px 16px;
  Øverst: label i ALL CAPS, color:#a8b8cc, font-size:0.62rem, letter-spacing:0.1em
  Midt: stor talværdi, font-family:'Courier New', color:#fff, font-size:2rem, font-weight:700
  Enhed: color:#00c8ff, font-size:0.78rem, margin-left:5px
  Bund: SVG mini-sparkline (60×16px) MED cyan polyline, ELLER trend-pil

SVG SPARKLINE PATTERN (inkludér i hvert vigtige metrik-kort):
  <svg width="60" height="16" viewBox="0 0 60 16">
    <polyline points="0,14 10,10 20,12 30,6 40,8 50,4 60,6"
              fill="none" stroke="#00c8ff" stroke-width="1.5" opacity="0.7"/>
    <polyline points="0,14 10,10 20,12 30,6 40,8 50,4 60,6 60,16 0,16"
              fill="rgba(0,200,255,0.08)" stroke="none"/>
  </svg>

SVG ARC-GAUGE (til vigtige målinger — brug ved pumper og procesmålinger):
  <svg viewBox="0 0 120 120" width="100" height="100">
    <circle cx="60" cy="60" r="46" fill="none" stroke="rgba(0,200,255,0.12)" stroke-width="9"
            stroke-dasharray="240 360" stroke-dashoffset="-60" stroke-linecap="round"/>
    <circle cx="60" cy="60" r="46" fill="none" stroke="#00c8ff" stroke-width="9"
            stroke-dasharray="[procent * 2.4] 360" stroke-dashoffset="-60" stroke-linecap="round"
            style="filter:drop-shadow(0 0 4px rgba(0,200,255,0.6))"/>
    <text x="60" y="55" text-anchor="middle" fill="#fff" font-family="Courier New"
          font-size="22" font-weight="700">[VAL]</text>
    <text x="60" y="68" text-anchor="middle" fill="#00c8ff" font-size="10">[UNIT]</text>
    <text x="60" y="82" text-anchor="middle" fill="#5a6a7a" font-size="9">[LABEL]</text>
  </svg>

━━━ SYSTEM-DIAGRAM / P&ID (iSolutions Suite stil) ━━━
Tegn et SVG-procesdiagram når anlægget beskrives. Stil:
- Baggrund: #0d1421 med svag grid (stroke:#1a2535, opacity:0.4)
- Rørlinjer: stroke:#0077C8, stroke-width:2 for aktiv flow; stroke:#2a3d55 for inaktiv
- Flow-pilehoveder: fill:#00c8ff
- Komponenter (pumper, ventiler, tanke) i #1e2d40 border og #00c8ff outline
- Status-LED på hver komponent: grøn glow for drift, rød for alarm
- Labels i ALL CAPS, color:#a8b8cc, font-size:9px

━━━ STATUS-LED CSS ━━━
  DRIFT:    background:#00d084; box-shadow:0 0 6px #00d084, 0 0 14px rgba(0,208,132,0.5);
  ADVARSEL: background:#ffb800; box-shadow:0 0 6px #ffb800, 0 0 14px rgba(255,184,0,0.5);
  ALARM:    background:#ff4757; box-shadow:0 0 6px #ff4757, 0 0 14px rgba(255,71,87,0.5);
            animation:ledAlarm 1.2s ease-in-out infinite;
  OFFLINE:  background:#3a4a5a; box-shadow:none;
  @keyframes ledAlarm { 0%,100%{opacity:1} 50%{opacity:.25} }

━━━ KNAPPER (Grundfos HMI-stil) ━━━
  PRIMÆR (f.eks. FORTSÆT / START):
    background:#00c8ff; color:#0d1421; font-weight:700; letter-spacing:0.1em;
    border:none; border-radius:4px; padding:12px 28px; font-size:0.8rem;
    box-shadow:0 0 16px rgba(0,200,255,0.4);

  SEKUNDÆR (f.eks. TILBAGE / ANNULLER):
    background:transparent; color:#fff; border:1px solid rgba(255,255,255,0.4);
    border-radius:4px; padding:12px 28px; font-size:0.8rem; letter-spacing:0.1em;

━━━ TRIN-INDIKATOR (ved startup/protokol-sekvenser) ━━━
  Vandret progress-bar med 4-5 trin:
  FÆRDIG:    ⊙-cirkel i #00d084 + fed tekst "Completed"
  AKTIV:     ⊙-cirkel i #00c8ff + animation puls + tekst "Activating..."
  VENTER:    Tom cirkel i #2a3d55 + grå tekst "Step X"
  Forbindende linje: 2px, #2a3d55 for venter, #00c8ff for passerede trin

━━━ DOMÆNE-PARAMETRE (brug nævnte værdier, ellers disse) ━━━

PUMPE (Grundfos):
  Flow: 18.5 m³/h | Tryk: 4.2 bar | RPM: 2850 | Temp: 65°C | Virkningsgrad: 78% | Effekt: 3.2 kW

SHORE POWER / LANDSTRØMSANLÆG:
  Spænding: 6.6 kV | Strøm: 420 A | Effekt: 4.8 MW | Frekvens: 50 Hz
  Stationer: Power Station 1 (North) AVAILABLE | Power Station 2 (South) OCCUPIED
  Faser: Cooling ✓ | Main Entry Breaker ✓ | Active Frontend ⟳ | Grid Converter ○ | Pre-connect ○

FREKVENSOMFORMER:
  Frekvens: 48.5 Hz | Udgangsstrøm: 7.2 A | DC-link: 540 V | Effektivitet: 96%

━━━ ANTI-PATTERNS — MÅ ALDRIG BRUGES ━━━
  ✗ Lys/hvid baggrund
  ✗ Bootstraps standard-blå (#007bff) eller grøn (#28a745)
  ✗ Runde hjørner > 14px
  ✗ Emoji — brug altid Unicode-symboler (▲ ▼ ◉ ⚠ ∿ ⊙ ⟳ ≋ →)
  ✗ Gradient-baggrunde på selve appen (kun på tiles og knapper)
  ✗ Tomme gauges — altid realistiske tal
  ✗ Font-size < 9px (læsbarhed på touchskærme)

━━━ ØVRIGE VISUALISERINGSTYPER (høj fidelity kræves for ALLE) ━━━
Bruges primært når ingen HMI/SCADA-kontekst er til stede. Alle typer skal have:
- Minimum 60 linjer CSS
- Præcis typografisk hierarki (3 størrelsesniveauer)
- Farvekodning med forklaring/legende
- Realistisk indhold fra transskriptionen (ikke placeholder)

1. KRAVSPECIFIKATIONSTABEL → krav, parametre, grænseværdier, specifikationer
   Format: Tabel med farvet header (#002A5C), alternerende rækker, kolonnerne: Parameter | Krav/Værdi | Enhed | Prioritet | Ansvarlig | Status

2. KANBAN-BOARD → opgaver, handlingspunkter, to-do
   Kolonner: Backlog | I Gang | Afventer | Færdig — med opgavekort der har prioritets-chip, ansvarlig-avatar og deadline

3. BESLUTNINGSLOG → beslutninger, aftaler, konklusion
   Format: Kortbaseret layout, hvert kort med beslutnings-id, ikoner, ansvarlig, status-chip og rationale

4. TIDSLINJE → datoer, faser, milepæle, leverancer
   Format: Horisontal SVG-tidslinje med milepæls-prikker, farvekodede faser og tooltip-labels

5. MINDMAP → brainstorm, idégenerering, åbne diskussioner
   Format: SVG centralt emne med SVG-linjer ud til noder og under-noder, farvekodede grene

6. KOMBINERET OVERBLIK → møder der dækker mange emner
   Format: Sektionsopdelt dashboard med 2-3 mini-visualiseringer af ovenstående typer

━━━ STØJROBUSTHED OG DANSK MØDETALE ━━━
Transskriptioner fra rigtige møder er ALDRIG perfekte. Du SKAL håndtere disse forhold:

DANSKE TALE-MØNSTRE — ignorer ved visualisering:
  - Fyldeord og tøvepauser: "øh", "øhm", "altså", "så øh", "nå men", "ikk' også"
  - Gentagelser fra tøven: "det er det er", "vi vi kan", "ja ja ja", "altså altså"
  - Afbrudte sætninger og omstart: "vi skal — altså vi bør overveje..."
  - Sammensatte ord splittet af ASR: "pumpe hus" = "pumpehus", "flow rate" = "flowrate"
  - Udtynding af sentence-endings: ord i slutningen af sætninger kan mangle eller være forkert

STØJ OG AUDIOPROBLEMER — ignorér disse:
  - Baggrundsstøj (ventilation, kontorbaggrund) kan give meningsløse enkeltord
  - Keyboard-, stol- og hostlyde kan dukke op som tilfældige ord
  - Overlappende tale kan give forvrænget eller inkoherent tekst
  - Mikrofonafstand giver udtydelig tale → ord kan være forkert transskriberet

HÅNDTERINGSREGLER:
  1. Fokusér på de KLARE, MENINGSFULDE dele — ignorer åbenlys støj og fragmenter
  2. Tekniske termer kan være stavet fonetisk: "virkningsgrad" → "virkeningsgrad", "frekvensomformer" → "frekvens omformer"
  3. Blandede dansk/engelske sætninger er NORMALE — Grundfos samarbejder internationalt
  4. Engelske termer bruges i dansk kontekst: "flow", "pressure", "setpoint", "PLC", "SCADA", "HMI"
  5. Hvis transskriptionen er under 8 meningsfulde ord eller domineres af støj, returnér et simpelt ventetilstand-panel:
     "<div style='background:#1a1a2a;border-radius:12px;padding:40px;text-align:center;color:#7aabde;font-family:sans-serif'><div style='font-size:2.5rem;margin-bottom:16px'>🎙️</div><h2 style='color:#fff;margin-bottom:8px'>Afventer input...</h2><p>Fortsæt med at tale — Claude visualiserer automatisk når der er nok indhold.</p></div>"

BILINGUAL MØDER:
  - Visualisér naturligt uanset om mødet er på dansk, engelsk eller blandet
  - Brug det primære sprog som basis, men tag tekniske termer på begge sprog med

━━━ REGULATORISKE RAMMER — KRITISK INFRASTRUKTUR ━━━
Grundfos leverer pumpeløsninger til kritisk infrastruktur (vand, energi, bygninger). Disse regulatoriske begreber er IKKE fysiske komponenter — de er EU-lovkrav og sikkerhedsstandarder der skal overholdes som et LAG OVENPÅ tekniske løsninger.

Når disse nævnes i et møde, skal du visualisere dem som compliance-/sikkerhedsoverview — ALDRIG som hardware.

CER — Critical Entities Resilience (EU-direktiv 2022/2557):
  - HVAD: EU-direktiv om fysisk modstandsdygtighed for kritiske enheder i 11 sektorer
  - SEKTORER: energi, transport, vand/spildevand, sundhed, digital infrastruktur, fødevarer m.fl.
  - Grundfos er leverandør til ALLE disse sektorer og er dermed direkte berørt
  - KRAV til operatører: risikovurdering, fysiske sikringsforanstaltninger, beredskabsplaner,
    baggrundstjek af nøglepersonale, hændelsesrapportering til myndigheder
  - FORMÅL: beskytte mod trusler som naturkatastrofer, cyberangreb, tekniske sammenbrud, terror
  - CER = FYSISK resiliens (modsat NIS2 der handler om cyber)
  - Deadline: national implementering medio 2024/2025

NIS2 — Network and Information Security Directive 2 (EU-direktiv 2022/2555):
  - HVAD: EU-direktiv om cybersikkerhed for væsentlige og vigtige enheder
  - To kategorier: "Væsentlige enheder" (kritisk infrastruktur) og "Vigtige enheder"
  - KRAV: risikostyring, adgangskontrol, kryptering, supply chain-sikkerhed,
    hændelsesrapportering inden 24 timer (initial), 72 timer (detaljeret)
  - NIS2 = CYBER resiliens (modsat CER der handler om fysisk sikring)
  - Grundfos-produkter (pumper, HMI, SCADA-integration) er en del af kunders NIS2-scope

FORHOLDET CER ↔ NIS2:
  - CER og NIS2 er KOMPLEMENTÆRE — begge kræves samtidigt
  - CER: "Er anlægget fysisk sikkert mod angreb og nedbrud?"
  - NIS2: "Er styringssystemerne og dataen cybersikre?"
  - Grundfos-pumper med digitale interfaces (CIM-modul, BMS-integration) berøres af begge

ANDRE RELEVANTE STANDARDER der kan nævnes:
  - IEC 62443: cybersikkerhedsstandard specifikt for industrielle styresystemer (OT/ICS)
  - GDPR: databeskyttelse (relevant for brugerdata i cloud-tilsluttede pumpeløsninger)
  - ISO 27001: informationssikkerhedsstyring
  - ATEX/Ex-direktiver: eksplosionsbeskyttelse (fysisk sikkerhed, pumper i farlige miljøer)
  - EN ISO 9906: hydraulisk ydeevnetest for pumper

ASR-FORVEKSLINGER FOR REGULATORISKE AKRONYMER — fortolk altid således:
  - "sær", "seer", "cear", "CR", "C R", "c.e.r"  →  CER (Critical Entities Resilience)
  - "NIS 2", "nice to", "niis2", "N.I.S.2"         →  NIS2
  - Hvis "sær" optræder i en sætning om EU, direktiv, sikkerhed, kritisk infrastruktur,
    compliance, resiliens eller lignende → fortolk ALTID som CER, ikke som det danske ord "sær"
  - Eksempel: "vi skal overholde sær direktivet" = "vi skal overholde CER-direktivet"
  - Eksempel: "har I kigget på sær og NIS 2" = "har I kigget på CER og NIS2"

VISUALISERINGSREGLER for regulatoriske emner:
  1. Generer et COMPLIANCE-DASHBOARD når CER, NIS2 eller tilsvarende nævnes
  2. Vis det som et OVERLAY-LAG over den tekniske løsning — ikke som en erstatning for den
  3. Brug en tabel eller statusgrid med: Krav | Status (✓/⚠/✗) | Ansvarlig | Deadline | Kommentar
  4. Farvekod: grøn = opfyldt, gul = delvist/under arbejde, rød = mangler/kritisk
  5. Angyd ALTID i en note: "Regulatorisk krav — gælder som lag over teknisk løsning"
  6. Kombiner gerne med den tekniske visualisering i et splittet dashboard:
     - Venstre/top: teknisk kontrolpanel (pumpe/system)
     - Højre/bund: compliance-status for de nævnte krav

━━━ ØVRIGE VISUALISERINGSTYPER ━━━
Bruges når ingen specifik industriel komponent er nævnt:

1. KRAVSPECIFIKATIONSTABEL → krav, parametre, grænseværdier, specifikationer
   Format: Tabel med kolonner: Parameter | Krav/Værdi | Enhed | Prioritet | Ansvarlig

2. KANBAN-BOARD → opgaver, handlingspunkter, to-do
   Kolonner: Backlog | I Gang | Afventer | Færdig

3. BESLUTNINGSLOG → beslutninger, aftaler, konklusion
   Format: Tabel med: Beslutning | Begrundelse | Ansvarlig | Deadline

4. TIDSLINJE → datoer, faser, milepæle, leverancer
   Format: Horisontal tidslinje med farvekodede faser

5. MINDMAP / KLYNGE-DIAGRAM → brainstorm, idégenerering, åbne diskussioner
   Format: Centralt emne med radierende grene

6. KOMBINERET OVERBLIK → møder der dækker flere emner
   Format: Sektionsopdelt dashboard med 2-3 mini-visualiseringer

━━━ OUTPUT-KRAV ━━━
- Returnér KUN HTML startende med <style> og sluttende med </div>
  Format: <style>/* al CSS samlet øverst */</style><div>/* HTML herunder */</div>
- Brug en <style>-blok øverst til al CSS (ikke inline på hvert element) — det giver renere, rigere output
- Responsive, men designet primært til 16:9 widescreen (min-width: 800px)
- HMI-interfaces: altid dark-on-dark Grundfos iSolutions-paletten (cyan #00c8ff på navy #0d1421)
- Ikke-HMI typer: Grundfos brand (navy #002A5C + blå #0077C8 + hvid) på lys baggrund
- Brug KUN Unicode-symboler — aldrig emoji i teknisk kontekst
- Tekster på dansk (med engelske termer bevarede: flow, pressure, HMI, SCADA, etc.)
- Minimumskrav til indhold: mindst 80 linjer CSS, detaljerede værdier fra konteksten
- Inkludér altid disse CSS-keyframes i <style>:
    @keyframes ledAlarm { 0%,100%{opacity:1} 50%{opacity:.25} }
    @keyframes fadeIn   { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:none} }
    @keyframes spin     { to{transform:rotate(360deg)} }
- Footer: diskret linje med "Genereret af Meeting AI Visualizer · Grundfos" i muted farve, font-size:0.62rem
`;

// ─── HTTP Server ──────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const url = req.url === '/' ? '/index.html' : req.url;

  // POST /api/visualize
  if (req.method === 'POST' && req.url === '/api/visualize') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { transcript: rawTranscript, roomId, title, vizType, isIncremental, previousViz } = JSON.parse(body);
        // If roomId provided, use attributed room transcript
        let transcript = rawTranscript;
        if (roomId && rooms.has(roomId)) {
          const room = rooms.get(roomId);
          if (room.transcript.length > 0) {
            transcript = room.transcript.map(s => `[${s.name}]: ${s.text}`).join('\n');
          }
        }
        if (!transcript || !transcript.trim()) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Ingen transskription modtaget.' }));
        }

        // Stream response via SSE so the client sees output immediately
        res.writeHead(200, {
          'Content-Type':      'text/event-stream',
          'Cache-Control':     'no-cache',
          'Connection':        'keep-alive',
          'X-Accel-Buffering': 'no',
        });
        res.flushHeaders();

        const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type':      'application/json',
            'x-api-key':         ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model:      'claude-sonnet-4-6',
            max_tokens: 8192,
            stream:     true,
            system:     SYSTEM_PROMPT,
            messages: [{
              role:    'user',
              content: `${title ? `Mødetitel: ${title}\n\n` : ''}Her er mødetransskriptionen:\n\n${transcript}\n\n${vizType && vizType !== 'auto' ? `VIGTIG INSTRUKS: Generer SPECIFIKT denne visualiseringstype — ikke noget andet: ${vizType}\n\n` : ''}${isIncremental && previousViz ? `INKREMENTEL OPDATERING: Du har allerede genereret en visualisering til dette møde (vedlagt nedenfor). Mødet er fortsat — opdater og udvid visualiseringen med de nyeste informationer fra transskriptionen. Bevar den overordnede struktur og tilføj/juster indhold.\n\nNUVÆRENDE VISUALISERING (HTML):\n${previousViz.slice(0, 3000)}...\n\n` : ''}Generer en passende HTML-visualisering.`,
            }],
          }),
        });

        if (!apiRes.ok) {
          const errText = await apiRes.text();
          console.error('Anthropic API fejl:', errText);
          try { res.write(`data: ${JSON.stringify({ error: 'Claude API fejl. Tjek din API-nøgle.' })}\n\n`); } catch (_) {}
          return res.end();
        }

        // Pipe Anthropic SSE → client SSE, accumulate full HTML
        let fullHtml = '';
        const reader  = apiRes.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split('\n');
          buf = lines.pop(); // keep incomplete last line
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const raw = line.slice(6).trim();
            if (!raw || raw === '[DONE]') continue;
            try {
              const evt = JSON.parse(raw);
              if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
                const chunk = evt.delta.text;
                fullHtml += chunk;
                res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
              }
            } catch (_) {}
          }
        }

        // Save and signal completion
        const id = crypto.randomUUID();
        const record = saveMeeting(id, title, transcript, fullHtml.trim());
        res.write(`data: ${JSON.stringify({ done: true, id, title: record.title })}\n\n`);
        res.end();

        // Broadcast completed visualization to ALL other room members (real-time sharing)
        if (roomId && rooms.has(roomId)) {
          broadcastToRoom(roomId, 'visualization', { id, title: record.title, html: fullHtml.trim() });
        }
      } catch (err) {
        console.error('Serverfejl:', err.message);
        try { res.write(`data: ${JSON.stringify({ error: 'Intern serverfejl: ' + err.message })}\n\n`); } catch (_) {}
        res.end();
      }
    });
    return;
  }

  // POST /api/room/create
  if (req.method === 'POST' && req.url === '/api/room/create') {
    const id = createRoom();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ id }));
  }

  // GET /api/room/:id/events?name=...  (SSE — long-lived connection)
  const roomEventsMatch = req.url.match(/^\/api\/room\/([A-Z0-9]{6})\/events(\?.*)?$/);
  if (req.method === 'GET' && roomEventsMatch) {
    const roomId = roomEventsMatch[1];
    const qs    = new URLSearchParams(roomEventsMatch[2] ? roomEventsMatch[2].slice(1) : '');
    const name  = qs.get('name') || 'Anonym';
    if (!rooms.has(roomId)) {
      // Try to restore from disk (server may have restarted mid-meeting)
      const saved = loadPersistedRoom(roomId);
      if (saved) {
        rooms.set(roomId, { id: roomId, createdAt: Date.now(), clients: new Map(), transcript: saved.transcript });
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: 'Møderum ikke fundet.' }));
      }
    }
    res.writeHead(200, {
      'Content-Type':    'text/event-stream',
      'Cache-Control':   'no-cache',
      'Connection':      'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.flushHeaders();
    const room = rooms.get(roomId);
    // Send current state to this new joiner
    res.write(`event: init\ndata: ${JSON.stringify({ transcript: room.transcript, participants: [...room.clients.keys()] })}\n\n`);
    // Register client
    room.clients.set(name, res);
    broadcastToRoom(roomId, 'join', { name, participants: [...room.clients.keys()] }, name);
    // Heartbeat every 20s to keep connection alive through proxies
    const heartbeat = setInterval(() => { try { res.write(': ping\n\n'); } catch (_) {} }, 20000);
    req.on('close', () => {
      clearInterval(heartbeat);
      room.clients.delete(name);
      broadcastToRoom(roomId, 'leave', { name, participants: [...room.clients.keys()] });
    });
    return;
  }

  // POST /api/room/:id/segment
  const roomSegMatch = req.url.match(/^\/api\/room\/([A-Z0-9]{6})\/segment$/);
  if (req.method === 'POST' && roomSegMatch) {
    const roomId = roomSegMatch[1];
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', () => {
      try {
        const { name, text } = JSON.parse(body);
        const room = rooms.get(roomId);
        if (!room) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Møderum ikke fundet.' }));
        }
        const segment = { name: name || 'Anonym', text, timestamp: new Date().toISOString() };
        room.transcript.push(segment);
        persistRoom(roomId, room.transcript); // survive server restarts
        broadcastToRoom(roomId, 'segment', segment, name); // don't echo back to sender
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // GET /api/room/:id/state
  const roomStateMatch = req.url.match(/^\/api\/room\/([A-Z0-9]{6})\/state$/);
  if (req.method === 'GET' && roomStateMatch) {
    const room = rooms.get(roomStateMatch[1]);
    if (!room) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Møderum ikke fundet.' }));
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ id: room.id, transcript: room.transcript, participants: [...room.clients.keys()] }));
  }

  // GET /api/assemblyai-token — issue temporary AssemblyAI token for client
  if (req.method === 'GET' && req.url === '/api/assemblyai-token') {
    if (!ASSEMBLYAI_API_KEY) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'ASSEMBLYAI_API_KEY ikke sat på serveren.' }));
    }
    try {
      const tokenRes = await fetch('https://api.assemblyai.com/v2/realtime/token', {
        method:  'POST',
        headers: { Authorization: ASSEMBLYAI_API_KEY, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ expires_in: 480 }),
      });
      const tokenData = await tokenRes.json();
      if (!tokenRes.ok) throw new Error(tokenData.error || 'Token-fejl');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ token: tokenData.token }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: err.message }));
    }
  }

  // GET /api/history
  if (req.method === 'GET' && req.url === '/api/history') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(loadHistory()));
  }

  // GET /api/meeting/:id
  const meetingMatch = req.url.match(/^\/api\/meeting\/([^/?]+)$/);
  if (req.method === 'GET' && meetingMatch) {
    const meeting = loadMeeting(meetingMatch[1]);
    if (!meeting) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Møde ikke fundet.' }));
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(meeting));
  }

  // DELETE /api/meeting/:id
  const deleteMeetingMatch = req.url.match(/^\/api\/meeting\/([^/?]+)$/);
  if (req.method === 'DELETE' && deleteMeetingMatch) {
    const ok = deleteMeeting(deleteMeetingMatch[1]);
    res.writeHead(ok ? 200 : 404, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok }));
  }

  // Serve static files from /public
  const filePath = path.join(__dirname, 'public', url);
  const ext      = path.extname(filePath);
  const mime     = MIME[ext] || 'text/plain';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`\n🎙️  Meeting AI Visualizer kører på http://localhost:${PORT}`);
  console.log(`   Åbn Chrome og gå til adressen ovenfor.\n`);
});
