# Helios Gea — sito (HR / EN)

File: `index.html`, `assets/style.css`, `assets/main.js` (nessuna libreria, nessuna build).
Lingua di default croato, `?lang=en` per l'inglese.

Principio: le foto si mostrano **intere, nelle proporzioni originali**, mai ritagliate né mascherate,
su uno sfondo che si fonde con lo scatto (bianco per lo studio, nero per le pietre).
Ogni foto si apre a schermo intero (lightbox con frecce, swipe, Esc).

Immagini: `img/p/` (prodotti, studio) e `img/g/` (pietre e grafiche del brand), ognuna in due misure WebP
(`-800` e `-1600`), ricavate dagli originali solo ridimensionandoli.

Anteprime in un solo file:
- `python3 scripts/build-preview.py` → `dist/helios-gea-preview.html`
- `python3 scripts/build-artifact.py` → `dist/helios-gea-anteprima.html` (versione per il link da telefono)
