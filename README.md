# mnemonic.guru

Mehrseitige Website mit Vite, Bootstrap, Sass und Vanilla JavaScript.

## Features

- mehrere statische Seiten mit gemeinsamer Navigation
- Darkmode/Lightmode mit Persistenz per `localStorage`
- Tool-Bereich mit `Whois` und `Crypto`
- responsive Layouts auf Basis von Bootstrap 5
- SCSS-basierte zentrale Styles

## Tech Stack

- Vite
- Bootstrap 5
- Sass
- Vanilla JavaScript
- PHP fuer API-Endpunkte

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

## Projektstruktur

```text
.
|-- index.html
|-- tools.html
|-- whois.html
|-- gctools.html
|-- api/
|   `-- index.php
|-- src/
|   |-- main.js
|   |-- gctools.js
|   |-- whois.js
|   `-- styles.scss
`-- vite.config.js
```

## Hinweise

- Der Build laeuft aktuell trotz Bootstrap-Sass-Deprecation-Warnungen sauber durch.
