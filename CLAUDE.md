# Table video

Progetto video con le skill HyperFrames (in `.claude/skills/`). Rispondi in italiano.

## Voce (voiceover / TTS)

- Voce del progetto: **ElevenLabs "Sarah"** (`EXAVITQu4vr4xnSDxMaL`), modello `eleven_multilingual_v2`.
- Impostazioni: stability 0.6, similarity_boost 0.75, style 0.15, speed 0.95 (calda e calma).
- Genera le voiceover con `scripts/voce.sh "testo" assets/voice/<nome>.wav`, non con il TTS
  di media-use: la chiave ElevenLabs è una credenziale dell'ambiente cloud iniettata
  come header `xi-api-key` su `api.elevenlabs.io`, quindi `$ELEVENLABS_API_KEY` non è
  impostata e media-use ricadrebbe su HeyGen/Kokoro.
- La chiave non ha il permesso `voices_read`: non si può elencare il catalogo voci via API.
- ElevenLabs non restituisce i timestamp delle parole: per i sottotitoli trascrivi il wav con
  `npx hyperframes transcribe <file>.wav`.
