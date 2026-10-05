# Helios Gea — sito (HR / EN)

File: `index.html`, `assets/style.css`, `assets/main.js` (nessuna libreria, nessuna build).
Lingua di default croato, `?lang=en` per l'inglese.

Concetto: una sequenza di scene interattive, non un documento. Le foto sono sempre **intere, nelle proporzioni originali**.
Scene: anello 3D di foto trascinabile → frase manifesto che si accende → racconto con foto fissa che cambia →
globo con la 45ª parallela → linea viso → showroom prodotti → nastri di foto → private label → motto → contatti.
Apertura: ramo d'ulivo disegnato e animato davanti a un sole (Helios = sole, Gea = terra).
Showroom: toccando un prodotto si apre la scheda con descrizione e modo d'uso. In fondo c'è un modulo di contatto.
I testi lunghi stanno dietro "Pročitajte više". Ogni foto si apre a schermo intero.

Immagini: `img/p/` (prodotti, studio) e `img/g/` (pietre e grafiche del brand), ognuna in due misure WebP
(`-800` e `-1600`), ricavate dagli originali solo ridimensionandoli.

Anteprime in un solo file:
- `python3 scripts/build-preview.py` → `dist/helios-gea-preview.html`
- `python3 scripts/build-artifact.py` → `dist/helios-gea-anteprima.html` (versione per il link da telefono)

## Modulo di contatto

Il modulo (`<form id="upit" data-endpoint="">` in `index.html`) valida i campi ma **non invia nulla finché `data-endpoint` è vuoto**:
mostra un avviso con il numero di telefono. Per attivarlo inserire l'URL di un servizio che riceve i form
(es. Formspree: `https://formspree.io/f/xxxx`) o di uno script sul vostro hosting; i dati arrivano come `multipart/form-data`
(`name`, `email`, `phone`, `company`, `topic`, `message`, `consent`).

## Sorgenti della pagina

`index.html` è generato: modificare `scripts/src/page.template.html` (struttura), `scripts/src/descriptions.py`
(descrizioni prodotti HR/EN) e poi lanciare `python3 scripts/src/gen.py scripts/src .`
