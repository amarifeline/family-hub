# Family hub

Het keukenscherm van het gezin: een startscherm met tegels, en per app een eigen map.

```
index.html          startscherm (klok, datum, tegels)
fruit/              Mila's fruitmenu
agenda/             gezinsagenda (Google Agenda)
spaardoelen/        spaardoelen met spaarvarken (collectie spaardoelen)
pakjes/             bestellingen die we nog verwachten, uit Gmail (met QR-code om te volgen)
instellingen/       verbinding en sleutel nakijken, opslag testen
shared/
  config.js         adres van de opslag (Apps Script)
  hub-db.js         de opslag, zelfde aanroepen als in Claude-artefacts
  kiosk.js          keukengedrag: geen menu bij lang drukken, na 3 min terug naar start
  huisstijl.css     kleuren en lettertypes
  qrcode.js         QR-codes maken (qrcode-generator van Kazuhiko Arase, MIT-licentie)
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

## Pakjes uit Gmail

De tegel met de enveloppe toont de bestellingen die nog onderweg zijn. Het Apps Script leest daarvoor de bestel- en verzendmails van de laatste 30 dagen (Amazon, Zara, bol, DreamLand, bpost, PostNL, DHL, DPD, GLS, …). Het verandert niets in Gmail, en de hub krijgt enkel een samenvatting: winkel, wat, stand, verwachte dag en de link om te volgen.

Eenmalig instellen:

1. Open in Apps Script het bestand `Code.gs` en vervang de inhoud door de nieuwe versie uit het Claude-project (`claude/apps-script-Code.gs`).
2. Klik naast **Bestanden** op **+ → Script**, noem het `Pakjes` en plak de inhoud van `claude/apps-script-Pakjes.gs`. Opslaan.
3. Kies bovenaan de functie **testPakjes** en klik op **Uitvoeren**. Google vraagt nu toestemming om Gmail te lezen: zelfde stappen als bij de sleutel. In het logboek zie je welke pakjes het vond.
4. **Implementeren → Implementaties beheren → potlood → Versie: Nieuwe versie → Implementeren.**

Goed om te weten:
- Op het keukenscherm scan je de QR-code met je gsm om een pakje te volgen. **Open op dit scherm** opent de pagina van de vervoerder; dat venster sluit vanzelf na 3 minuten.
- Een pakje verdwijnt als er een mail komt dat het geleverd is, twee dagen na de verwachte dag (Amazon stuurt geen leveringsmail), of als je op **Ontvangen** tikt.
- Eigen verkopen (Vinted), retours en Collect&Go van Delhaize worden overgeslagen.
- Gmail wordt hoogstens om het kwartier gelezen; **Vernieuwen** kijkt meteen opnieuw.
- Iedereen met de sleutel ziet dus ook welke bestellingen er onderweg zijn.

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
