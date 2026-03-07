# Prompt Log — System Prompt Dokumentation

> Denne fil dokumenterer den nuværende system prompt i `server.js` og forklarer rationale bag hver sektion. Opdater den når prompten ændres.

---

## Nuværende version: v2.0 (2026-03-02)

Placering i kode: `server.js` → `const SYSTEM_PROMPT`

---

## Sektionsoversigt

### 1. Rolle og output-format
```
Du er en ekspert i at analysere mødetransskriptioner fra Grundfos...
Returnér KUN valid HTML med inline CSS — ingen markdown, ingen forklaringer...
```
**Rationale:** Claude skal ikke forklare sig eller pakke output ind i markdown-kodeblokke. HTML'en injectes direkte i DOM'en, så alt andet end ren HTML vil bræmme visningen. "KUN" og "ingen" er bevidst hårde formuleringer — Claude har en tendens til at tilføje forklarende tekst hvis der ikke sættes klare grænser.

---

### 2. Grundfos Brand Identitet
```
#002A5C (navy), #0077C8 (blå), #E8F4FD (lys blå)...
```
**Rationale:** Visualiseringerne skal se ud som om de hører til Grundfos' designsystem. Brandfarver giver øjeblikkelig genkendelse og professionalisme i en workshop-kontekst. Hex-koderne er baseret på offentligt tilgængelige Grundfos-ressourcer — bør verificeres mod officielle brand guidelines.

**OBS:** Claude bruger disse farver primært når Grundfos eller pumpe-kontekst er til stede. For generiske mødeemner falder den tilbage på neutrale farver.

---

### 3. Pump- og Teknisk Domæne
```
Hydrauliske parametre: flow, tryk, NPSH, virkningsgrad...
Pumpetyper: centrifugal, in-line, submersible...
```
**Rationale:** Claude kender ikke Grundfos' produktlinje fra sin træning i tilstrækkelig detalje til at agere som domæneekspert. Denne sektion "briefer" Claude inden hvert kald, så den genkender fagtermer korrekt — f.eks. at "CM" er en pumpeserie, at "IE3" er en energiklasse, og at "NPSH" er et hydraulisk begreb og ikke en forkortelse for noget andet.

---

### 4. Industrielt Kontrolpanel (højeste prioritet)
```
Hvis transskriptionen nævner pumpe, motor, ventil → generer KONTROLPANEL UI
```
**Rationale:** Dette er det mest differentierede og værdifulde output for Grundfos-møder. Et HMI-lignende kontrolpanel giver mødedeltagere et konkret, fælles referencepunkt der ligner hvad de arbejder med til daglig.

Prioriteringslogikken er bevidst: komponent-detektion trumfer alle andre visualiseringstyper, fordi det er her den største prototype-værdi ligger.

**Placeholder-værdier:** Når ingen specifikke tal nævnes i transskriptionen, indsættes realistiske placeholder-værdier (ikke nuller). Dette sikrer at visualiseringen altid ser meningsfuld og færdig ud — vigtigt i en prototype-/workshop-kontekst.

**PROTOTYPE-badge:** Alle kontrolpaneler viser tydeligt at de ikke er tilsluttet live data. Kritisk for at undgå misforståelser.

Trigger-ord (dansk): pumpe, motor, ventil, frekvensomformer
Trigger-ord (engelsk der kan optræde): pump, motor, valve, VFD, inverter

---

### 5. Øvrige visualiseringstyper
```
1. Kravspecifikationstabel
2. Kanban-board
3. Beslutningslog
4. Tidslinje
5. Mindmap
6. Kombineret overblik
```
**Rationale:** Møder hos Grundfos dækker mere end komponenter — der er også planlægning, beslutninger og brainstorm. Disse typer dækker de mest almindelige mødestrukturer. Rækkefølgen afspejler forventet hyppighed i kravspecifikationsmøder.

---

### 6. Output-krav
```
- Start med <div, slut med </div>
- Responsive, 60vw container
- Footer: "Genereret af Meeting AI Visualizer · Grundfos"
```
**Rationale:**
- `<div>`-wrapper sikrer at HTML kan injectes sikkert i eksisterende DOM
- 60vw matcher højre panels bredde i `index.html`
- Footer giver traceability og professionalisme i prototype-kontekst

---

## Prompt-justeringer der er overvejet men ikke implementeret

| Idé | Status | Begrundelse |
|---|---|---|
| Tilføj pumpekurve (Q/H-diagram) som SVG | Afventer | Kræver SVG-generation — Claude kan det, men output-størrelse kan overstige 4096 tokens |
| Sprog-detektion (engelsk/dansk mix) | Afventer | Grundfos-møder er primært dansk, men engelske fagtermer er normale |
| Flere komponenttyper (sensor, HEX, tank) | Afventer | Tilføjes når prototype er testet |
| Gem visualisering som PNG/PDF | Afventer | Kræver frontend-ændring (html2canvas eller lignende) |

---

## Sådan opdaterer du prompten

1. Rediger `SYSTEM_PROMPT` i `server.js`
2. Genstart serveren (`Ctrl+C` → `node server.js` eller dobbeltklik `START.bat`)
3. Opdater denne fil med hvad du ændrede og hvorfor
4. Tilføj en entry i `CHANGELOG.md`
