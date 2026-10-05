# Helios Gea — sito (HR / EN)

File: `index.html`, `assets/style.css`, `assets/main.js` (nessuna libreria, nessuna build).
Lingua di default croato, `?lang=en` per l'inglese.

Concetto: una sequenza di scene interattive, non un documento. Le foto sono sempre **intere, nelle proporzioni originali**.
Scene: anello 3D di foto trascinabile → frase manifesto che si accende → racconto con foto fissa che cambia →
globo con la 45ª parallela → linea viso → showroom prodotti → nastri di foto → private label → motto → contatti.
I testi lunghi stanno dietro "Pročitajte više". Ogni foto si apre a schermo intero.

Immagini: `img/p/` (prodotti, studio) e `img/g/` (pietre e grafiche del brand), ognuna in due misure WebP
(`-800` e `-1600`), ricavate dagli originali solo ridimensionandoli.

Anteprime in un solo file:
- `python3 scripts/build-preview.py` → `dist/helios-gea-preview.html`
- `python3 scripts/build-artifact.py` → `dist/helios-gea-anteprima.html` (versione per il link da telefono)
