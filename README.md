# Family hub

Het keukenscherm van het gezin: een startscherm met tegels, en per app een eigen map.

```
index.html          startscherm (klok, datum, tegels)
fruit/              Mila's fruitmenu
agenda/             gezinsagenda (Google Agenda)
spaardoelen/        spaardoelen met spaarvarken (collectie spaardoelen)
instellingen/       verbinding en sleutel nakijken, opslag testen
shared/
  config.js         adres van de opslag (Apps Script)
  hub-db.js         de opslag, zelfde aanroepen als in Claude-artefacts
  kiosk.js          keukengedrag: geen menu bij lang drukken, na 3 min terug naar start
  huisstijl.css     kleuren en lettertypes
  Miltona.otf       lettertype voor namen
```

## Meteen uitproberen (proefmodus)

Open `index.html` in Chrome. Zolang `shared/config.js` geen adres heeft, draait alles in proefmodus: de gegevens blijven in die ene browser. Linksonder staat dan "Proefmodus".

## Stap 1 — De opslag in een Google Sheet

1. Maak in Google Drive een nieuwe Google Sheet, bv. "Family hub – gegevens".
2. Kies **Extensies → Apps Script**. Wis wat er staat en plak de scriptcode. Die staat bewust niet in deze openbare map: een kopie zit in het Claude-project "Mila" (`claude/apps-script-Code.gs`). Klik op het diskette-icoon (opslaan).
3. Kies bovenaan de functie **stelSleutelIn** en klik op **Uitvoeren**. Google vraagt toestemming: kies je account, dan "Geavanceerd" → "Naar … (onveilig)" → "Toestaan". Dat is normaal voor een eigen script.
4. Open onderaan het **Uitvoeringslogboek** en kopieer de sleutel. Bewaar hem ergens veilig (bv. je wachtwoordbeheerder).
5. Kies **Implementeren → Nieuwe implementatie** → tandwiel → **Web-app**.
   - Uitvoeren als: **Ik**
   - Wie heeft toegang: **Iedereen**
   Klik op **Implementeren** en kopieer de URL die eindigt op `/exec`.

De tabbladen (`fruit`, `week`, …) maakt het script zelf aan bij de eerste keer schrijven.

> Pas je `Code.gs` later aan? Kies dan **Implementeren → Implementaties beheren → potlood → Versie: Nieuwe versie**. Zo blijft de URL dezelfde.

## Stap 2 — De pagina's op GitHub Pages

1. Maak op github.com een nieuwe **publieke** repository, bv. `family-hub`.
2. **Add file → Upload files**: sleep alle bestanden en mappen van deze map erin. Klik op **Commit changes**.
3. **Settings → Pages**: bij "Branch" kies `main` en `/ (root)`, dan **Save**.
4. Na een minuutje staat de hub op `https://<jouw-gebruikersnaam>.github.io/family-hub/`.

## Stap 3 — Hub en opslag koppelen

1. Open op GitHub `shared/config.js`, klik op het potlood, en zet de `/exec`-URL tussen de aanhalingstekens bij `endpoint`. Commit.
2. Open de hub **één keer** met de sleutel achter het adres:
   `https://<jouw-gebruikersnaam>.github.io/family-hub/?k=JOUW-SLEUTEL`
   Het toestel onthoudt de sleutel en haalt hem uit de adresbalk. (Of plak hem in **Instellingen**.)
3. Ga naar **Instellingen** en tik op **Test schrijven en lezen**. Je ziet "Gelukt" en hoe lang het duurde (meestal 1 à 2 seconden).

## Goed om te weten

- **De sleutel staat niet op GitHub**, want die map is openbaar. Wie de sleutel én het serveradres heeft, kan de gegevens lezen en wijzigen. Deel hem dus niet. Het is een slot op de keukendeur, geen kluis: zet er geen gevoelige gegevens in.
- **Wijzigingen verschijnen binnen ongeveer 5 seconden** op andere schermen. Je eigen tikken zie je meteen.
- **Na een herstart** toont de hub eerst wat hij nog wist en haalt daarna de nieuwste gegevens op.
- Elke nacht om 4 uur herlaadt het startscherm zich, zodat nieuwe versies van de hub vanzelf binnenkomen.

## Een artefact uit Claude overzetten

Artefacts uit Claude gebruiken `await claude.use("db")`. De hub biedt precies die ingang, dus de code werkt zo goed als ongewijzigd. Zet in de nieuwe app-map bovenaan:

```html
<link rel="stylesheet" href="../shared/huisstijl.css">
<script src="../shared/config.js"></script>
<script src="../shared/hub-db.js"></script>
<script src="../shared/kiosk.js"></script>
```

en voeg `data-home="../"` toe aan `<body>`. Daarna één regel in de lijst `APPS` in `index.html` voor de tegel.
