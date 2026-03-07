# Test Cases — Eksempel-transskriptioner

> Brug disse til at teste at visualiseringerne ser rigtige ud. Kopier teksten ind i transskriptionsfeltet (eller skriv den under en optagelse) og tryk "Visualisér".

---

## TC-01: Pumpe-kontrolpanel (trigger: komponent + parametre)

**Forventet output:** HMI-kontrolpanel for centrifugalpumpe med Grundfos-farver

**Transskription:**
```
Vi skal have specificeret kravene til den nye cirkulationspumpe til varmeanlægget.
Pumpen skal kunne levere et flow på minimum tolv komma fem kubikmeter i timen,
ved en løftehøjde på fire bar. Medietemperaturen vil ligge på cirka firs grader celsius.
Vi overvejer en Grundfos CM-serie. Energiklassen skal mindst være IE3,
og virkningsgraden bør ligge over halvfjerds procent. Materialet skal være rustfrit stål
da mediet indeholder klorider. Er der nogen der har input til omdrejningstallet?
```

**Tjekliste:**
- [ ] Viser HMI-kontrolpanel (mørk baggrund)
- [ ] Header i Grundfos navy (#002A5C)
- [ ] Flow: 12,5 m³/h (fra transskription)
- [ ] Tryk: 4 bar (fra transskription)
- [ ] Temperatur: 80 °C (fra transskription)
- [ ] Virkningsgrad: 70%+ (fra transskription)
- [ ] IE3 vist
- [ ] PROTOTYPE-badge synlig
- [ ] Footer: "Genereret af Meeting AI Visualizer · Grundfos"

---

## TC-02: Kravspecifikationstabel (trigger: krav uden specifik komponent)

**Forventet output:** Struktureret tabel med krav, værdier og ansvarlige

**Transskription:**
```
Lad os gennemgå kravspecifikationen for det nye anlæg.
Maksimalt driftstryk må ikke overstige seks bar, det er et hårdt krav.
Minimumflow er otte kubikmeter i timen, det er hvad processen kræver.
Medietemperaturen varierer mellem ti og niogtres grader afhængigt af årstid.
IP-klassen skal være minimum IP55 da anlægget står udendørs.
ATEX-klassificering er ikke nødvendigt i denne zone.
Levetidskrav er mindst tyve år med planlagt vedligehold hvert andet år.
Henrik er ansvarlig for at få godkendt trykspecifikationerne inden næste fredag.
```

**Tjekliste:**
- [ ] Tabel med kolonner: Parameter | Krav/Værdi | Enhed | Prioritet | Ansvarlig
- [ ] Maks. tryk: 6 bar (hårdt krav)
- [ ] Min. flow: 8 m³/h
- [ ] IP55 vist
- [ ] Henrik nævnt som ansvarlig
- [ ] Professionelt look, ikke HMI-mørkt

---

## TC-03: Motor-kontrolpanel (trigger: motor)

**Forventet output:** HMI-kontrolpanel for MGE-motor

**Transskription:**
```
Motoren til den nye løsning skal være en MGE-motor fra Grundfos.
Vi har brug for at den kan køre på variabelt omdrejningstal,
så vi skal have en frekvensomformer med.
Effekten er beregnet til fire kilowatt, og nominel strøm er ca seks komma otte ampere.
Motortemperaturen må ikke overstige åfirs grader under drift.
Vi skal bruge IE3 eller bedre.
```

**Tjekliste:**
- [ ] Viser motor-kontrolpanel
- [ ] Effekt: 4 kW
- [ ] Strøm: 6,8 A
- [ ] Maks. temperatur: 80 °C
- [ ] IE3 vist
- [ ] PROTOTYPE-badge synlig

---

## TC-04: Kanban-board (trigger: opgaver og handlingspunkter)

**Forventet output:** Kanban-board med Backlog / I Gang / Afventer / Færdig

**Transskription:**
```
Lad os lige lave en opgavestatus.
Peter er i gang med at tegne rørsystemet, det burde være færdigt torsdag.
Maria skal starte på at indhente tilbud fra leverandører, det er ikke begyndt endnu.
Vi venter på godkendelse fra bygherren før vi kan bestille pumper — det er Jens der følger op.
Energiberegningerne er færdige og godkendt.
Risikoanalysen er også på plads.
Næste punkt på backloggen er at lave installationsplan og idriftsættelsesprogram.
```

**Tjekliste:**
- [ ] Fire kolonner: Backlog | I Gang | Afventer | Færdig
- [ ] Peter/rørsystem i "I Gang"
- [ ] Maria/tilbud i "Backlog"
- [ ] Jens/godkendelse i "Afventer"
- [ ] Energiberegning + risikoanalyse i "Færdig"

---

## TC-05: Tidslinje (trigger: datoer og faser)

**Forventet output:** Horisontal tidslinje med projektfaser

**Transskription:**
```
Vi er enige om følgende tidsplan for projektet.
Forundersøgelse og kravspecifikation afsluttes inden udgangen af marts.
Design og projektering løber fra april til juni.
Indkøb og levering af udstyr forventes i juli.
Installation og montage er planlagt til august og september.
Idriftsætning og test er i oktober.
Aflevering til kunden sker den første november.
Garantiperiode løber de efterfølgende tolv måneder.
```

**Tjekliste:**
- [ ] Horisontal tidslinje
- [ ] Alle 6-7 faser vist
- [ ] Datoer/måneder korrekte
- [ ] Farvekodede faser

---

## TC-06: Blandet møde — kombineret overblik

**Forventet output:** Dashboard med 2-3 mini-sektioner

**Transskription:**
```
Vi har tre punkter på dagsordenen i dag.
Først kravene til pumpen: flow på femten kubikmeter i timen, tryk på tre bar, rustfrit stål.
Dernæst opgavestatus: Anders er i gang med beregningerne, Sofie skal starte på dokumentationen.
Til sidst tidsplanen: design færdigt i april, installation i juni, aflevering i august.
```

**Tjekliste:**
- [ ] Kombineret layout med flere sektioner
- [ ] Pumpekrav vist som tabel eller kontrolpanel
- [ ] Opgaver vist
- [ ] Tidslinje eller datoer vist

---

## Bedømmelseskala (til brugertest)

Brug denne skala når du evaluerer output med rigtige mødedeltagere:

| Score | Beskrivelse |
|---|---|
| 5 | Præcis, professionel, klar — klar til brug som referencepunkt |
| 4 | God, men mangler et par detaljer fra transskriptionen |
| 3 | Korrekt type, men upræcis eller mangler vigtige informationer |
| 2 | Forkert visualiseringstype valgt, men noget nyttigt indhold |
| 1 | Ubrugelig — forkert type, forkerte data, dårligt layout |

Noter også: Tok det for lang tid? Manglede noget? Var der noget overraskende godt?
