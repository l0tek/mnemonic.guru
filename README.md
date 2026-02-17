# mnemonic.guru

Interaktive Landingpage mit Vite, Bootstrap und Sass.

## Features

- Fullscreen Hero (`min-vh-100`) mit modernem Gradient-Hintergrund
- Canvas-Netzwerkanimation (`#spiders`) mit Mausinteraktion
- Darkmode/Lightmode Toggle (Sonne/Mond)
- Theme-Persistenz per `localStorage`
- Responsive Navigation mit Bootstrap Collapse

## Tech Stack

- Vite
- Bootstrap 5 (SCSS + JS Bundle)
- Sass
- Vanilla JavaScript

## Voraussetzungen

- Node.js 18+ (empfohlen)
- npm

## Installation

```bash
npm install
```

## Entwicklung

```bash
npm run dev
```

## Production Build

```bash
npm run build
```

## Build lokal testen

```bash
npm run preview
```

## Projektstruktur

```text
.
├─ index.html
├─ src/
│  ├─ main.js
│  └─ styles.scss
├─ package.json
└─ vite.config.js
```

## Hinweise

- Die Canvas-Animation läuft kontinuierlich und reagiert auf Mausposition.
- Bei Scrollen unterhalb der Hero-Höhe wird die Zeichenlogik pausiert.
- Sass zeigt aktuell Deprecation-Warnungen aus Bootstrap-Imports (`@import`), der Build ist dennoch erfolgreich.
