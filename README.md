# Reseller Listing AI

Ein kleiner MVP für einen Foto-basierten Listing-Generator für Vinted, eBay und Kleinanzeigen.

## Funktionen

- Upload von bis zu 3 Produktfotos
- KI erkennt sichtbare Eigenschaften wie Kategorie, Farbe, Stil, Zustand und Labels
- Generiert Vinted-Titel, Beschreibung, Hashtags und Preisvorschlag
- Generiert zusätzlich eine Kleinanzeigen-Version
- Copy-Buttons für schnelles Übernehmen

## Setup

```bash
npm install
cp .env.example .env.local
```

Trage in `.env.local` deinen OpenAI API Key ein:

```env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4.1-mini
```

Dann starten:

```bash
npm run dev
```

Öffne danach:

```text
http://localhost:3000
```

## Hinweise

- Die App automatisiert keinen Vinted-Account.
- Die KI soll keine Marke, Größe oder Materialangaben erfinden.
- Für beste Ergebnisse: Vorderseite, Rückseite und Label/Etikett hochladen.
