# IT Admin Guide — Meeting AI Visualizer til Teams

**Til:** Grundfos Teams-administrator
**Fra:** [Dit navn], specialeprojekt
**Tidsforbrug:** Ca. 2 minutter

---

## Hvad er dette?

Meeting AI Visualizer er en prototype-app udviklet som en del af et specialeprojekt i samarbejde med Grundfos. Appen transskriberer møder på dansk og genererer automatisk professionelle visualiseringer (pumpediagrammer, kravspecifikationstabeller, kanban-boards mv.) direkte i Teams-møder.

Appen er hostet på Railway (cloud) og kommunikerer med Anthropic's Claude AI API. Den indeholder **ingen brugerdata-opsamling** og **ingen login**.

---

## Hvad skal du gøre?

Upload den vedlagte ZIP-fil (`meeting-ai-grundfos.zip`) til Teams Admin Center.

### Trin 1
Gå til **Teams Admin Center**: https://admin.teams.microsoft.com

### Trin 2
Naviger til: **Teams-apps** → **Administrer apps**

### Trin 3
Klik **Upload ny app** (øverst til højre)

### Trin 4
Vælg `meeting-ai-grundfos.zip` og klik **Upload**

### Trin 5 (valgfrit men anbefalet til prototype)
Find **"Meeting AI Visualizer"** i listen → klik på den → under **Status** sæt til **Tilladt** → under **Tilgængelighed** kan du begrænse til specifikke brugere eller grupper hvis ønsket.

---

## Hvad sker der herefter?

Appen er nu synlig for organisationens brugere under "Tilføjet af din organisation" i Teams app-butikken. Brugere kan tilføje den til møder fra Apps-menuen.

---

## Sikkerhed og data

- Appen kører på `https://meeting-ai-visualizer.up.railway.app` (HTTPS)
- Mødetransskriptioner sendes til Anthropic's API til AI-behandling og returneres som HTML — ingen data gemmes
- Ingen brugerlogin, ingen adgang til Teams-data, ingen integrationstilladelser udover appens eget indhold
- Appen kan til enhver tid fjernes via Teams Admin Center → Administrer apps → Slet

---

## Spørgsmål?

Kontakt [Dit navn] på [Din email].
