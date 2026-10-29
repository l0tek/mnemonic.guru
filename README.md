# mnemonic.guru

Mehrseitige Website mit Vite, Bootstrap, Sass, Vanilla JavaScript und einer PHP-API.

## Features

- mehrere statische Seiten mit gemeinsamer Navigation und Brand-Logo
- Hero-Startseite mit Three.js-Thinker und responsivem Layout
- Darkmode/Lightmode mit Persistenz per `localStorage`
- News-Bereich mit externen RSS-Feeds
- Gallery-, Lab-, Tools- und p5.js-Bereiche
- Tool-Bereich mit `Whois` und `Crypto`
- responsive Layouts auf Basis von Bootstrap 5
- SCSS-basierte zentrale Styles

## Tech Stack

- Vite
- Bootstrap 5
- Sass
- Vanilla JavaScript
- Three.js
- PHP fuer API-Endpunkte
- SQLite fuer Content-Daten

## Voraussetzungen

- Node.js 18+
- npm
- PHP, wenn die lokalen API-Endpunkte getestet werden sollen

## Installation

```bash
npm install
```

## Entwicklung

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Preview

```bash
npm run preview
```

## API-Hinweis

- Frontend-API-Aufrufe zeigen auf `https://www.mnemonic.guru/api/index.php`.
- Fuer lokale PHP-Tests wird zusaetzlich eine lokal laufende API-Umgebung benoetigt.

## Projektstruktur

```text
.
|-- index.html
|-- gallery.html
|-- fraktale.html
|-- digitalart.html
|-- fotos.html
|-- lab.html
|-- raspi.html
|-- esp32.html
|-- code.html
|-- tools.html
|-- whois.html
|-- gctools.html
|-- news.html
|-- p5js.html
|-- public/
|   |-- Thinker.stl
|   `-- mnemonic-guru-icon-head-1to1.svg
|-- api/
|   `-- index.php
|-- src/
|   |-- main.js
|   |-- news.js
|   |-- gallery.js
|   |-- gctools.js
|   |-- p5js.js
|   |-- whois.js
|   `-- styles.scss
`-- vite.config.js
```

## Hinweise

### Admin und README-Import

- Unter `/4meo/` sind die Aufgaben in Übersicht, Inhalte, Medien und Gestaltung aufgeteilt.
- **Inhalte → README importieren** öffnet `/4meo/import.html`. Nach der Vorschau veröffentlicht der Import jede Markdown-Datei als neues Howto.
- Gespeichert wird der formatierte HTML-Inhalt in `data/content.sqlite` im Website-Verzeichnis auf dem Server (Tabelle `pages`, Schlüssel `howto`). Die originale `.md`-Datei wird nicht hochgeladen oder archiviert; `howto.html` wird nicht überschrieben.
- Importierte Anleitungen sind unter `/howto.html` öffentlich sichtbar und lassen sich über **Inhalte → Howtos bearbeiten** ändern. Ein erneuter Import fügt weitere Einträge hinzu.
- Lokale Bilder werden nicht mit importiert. Für relative Links und Bilder kann eine öffentliche Basis-URL angegeben werden.
- Für Sicherungen die SQLite-Datenbank und die ursprünglichen Markdown-Dateien aufbewahren.
- Einzelne Howtos oder Projekte lassen sich im Editor über **Eintrag entfernen** vormerken. **Speichern** übernimmt die Löschung; auch der letzte Eintrag kann entfernt werden.
- Unter **Medien → Hochgeladene Bilder verwalten** können Bilder nach Kategorie und Dateiname gesucht und dauerhaft inklusive Vorschaubild gelöscht werden. Bildverweise in Seiteninhalten werden nicht automatisch entfernt. p5.js-Projekte haben eine eigene Löschfunktion in der Projektliste.

- Der Build laeuft aktuell trotz Bootstrap-Sass-Deprecation-Warnungen sauber durch.
- Vite meldet weiterhin grosse Chunks fuer das Hauptbundle.
