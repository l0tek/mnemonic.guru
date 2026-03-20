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

- Der Build laeuft aktuell trotz Bootstrap-Sass-Deprecation-Warnungen sauber durch.
- Vite meldet weiterhin grosse Chunks fuer das Hauptbundle.