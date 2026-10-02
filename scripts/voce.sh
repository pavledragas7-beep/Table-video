#!/usr/bin/env bash
# Genera una voiceover con la voce del progetto (ElevenLabs "Sarah") e la salva in .wav.
# Uso: scripts/voce.sh "Testo da leggere" assets/voice/intro.wav
# La chiave ElevenLabs è iniettata dalla credenziale dell'ambiente cloud (header xi-api-key);
# se ELEVENLABS_API_KEY è impostata in locale, viene usata quella.
set -euo pipefail

TEXT="${1:?testo mancante}"
OUT="${2:?file di output .wav mancante}"

VOICE_ID="${VOICE_ID:-EXAVITQu4vr4xnSDxMaL}"   # Sarah
MODEL="${MODEL:-eleven_multilingual_v2}"
STABILITY="${STABILITY:-0.6}"
SIMILARITY="${SIMILARITY:-0.75}"
STYLE="${STYLE:-0.15}"
SPEED="${SPEED:-0.95}"

auth=()
[[ -n "${ELEVENLABS_API_KEY:-}" ]] && auth=(-H "xi-api-key: $ELEVENLABS_API_KEY")

body=$(TEXT="$TEXT" MODEL="$MODEL" STABILITY="$STABILITY" SIMILARITY="$SIMILARITY" STYLE="$STYLE" SPEED="$SPEED" \
  node -e 'const e=process.env;console.log(JSON.stringify({text:e.TEXT,model_id:e.MODEL,voice_settings:{stability:+e.STABILITY,similarity_boost:+e.SIMILARITY,style:+e.STYLE,speed:+e.SPEED}}))')

mkdir -p "$(dirname "$OUT")"
tmp=$(mktemp --suffix=.mp3)
trap 'rm -f "$tmp"' EXIT

code=$(curl -sS -m 120 -X POST "https://api.elevenlabs.io/v1/text-to-speech/$VOICE_ID" \
  "${auth[@]}" -H "Content-Type: application/json" -d "$body" -o "$tmp" -w "%{http_code}")
if [[ "$code" != "200" ]]; then
  echo "ElevenLabs ha risposto $code:" >&2; cat "$tmp" >&2; echo >&2; exit 1
fi

ffmpeg -y -loglevel error -i "$tmp" -ar 44100 -ac 1 "$OUT"
echo "ok → $OUT"
