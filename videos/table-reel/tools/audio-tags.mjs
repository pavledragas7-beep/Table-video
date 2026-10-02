// Writes the <audio> block of index.html: voiceover (Sarah), trap bed with ducking, and SFX on every animation.
// Run: node tools/audio-tags.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const dur = (f) => +execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString().trim();
const LEN = 30;

// [id, start]
const vo = [
  ["v01", 1.06], ["v02", 2.07], ["v03", 3.42], ["v04", 4.76], ["v05", 7.3],
  ["v06", 10.83], ["v07", 12.3], ["v08", 15.95], ["v09", 18.58], ["v10", 20.61],
  ["v11", 21.95], ["v12", 23.3], ["v13", 25.33], ["v14", 27.12], ["v15", 27.85],
];

// [file, start, volume, maxDuration?]
const sfx = [
  ["whoosh-cinematic", 0.0, 0.45, 1.6], ["sparkle", 0.9, 0.25],
  ["pop", 2.07, 0.5], ["whoosh-short", 3.42, 0.25], ["whoosh-short", 4.2, 0.35],
  ["click", 5.1, 0.7], ["whoosh-short", 5.44, 0.5], ["key-press", 5.6, 0.4], ["key-press", 5.85, 0.4], ["whoosh", 6.11, 0.5],
  ["click", 7.3, 0.7], ["whoosh-short", 7.46, 0.5], ["click", 8.47, 0.7],
  ["pop", 9.32, 0.45], ["pop", 9.49, 0.45], ["pop", 9.66, 0.45],
  ["whoosh-cinematic", 9.9, 0.55, 1.4], ["impact-bass-1", 10.83, 0.6], ["sparkle", 11.17, 0.45],
  ["click-soft", 12.52, 0.6], ["click-soft", 13.19, 0.6], ["whoosh-short", 13.87, 0.5], ["whoosh-short", 14.88, 0.5],
  ["click", 15.21, 0.7], ["whoosh-short", 15.55, 0.45], ["notification", 15.89, 0.45, 1.0],
  ["click", 16.9, 0.7], ["whoosh", 17.1, 0.55], ["coin", 17.57, 0.55], ["coin", 17.91, 0.55],
  ["click", 18.58, 0.7], ["coin", 18.62, 0.7],
  ["tick", 19.59, 0.7], ["tick", 19.93, 0.7], ["tick", 20.27, 0.7],
  ["impact-bass-2", 20.61, 0.45], ["sparkle", 20.7, 0.4], ["whoosh-short", 21.28, 0.5], ["pop", 21.62, 0.55],
  ["whoosh-short", 21.85, 0.5], ["click", 22.29, 0.7], ["pay", 22.4, 0.65],
  ["whoosh-short", 23.3, 0.45],
  ...[0, 1, 2, 3, 4, 5].map((i) => ["click-soft", +(23.98 + i * 0.1686).toFixed(3), 0.5]),
  ["whoosh-short", 25.2, 0.5], ["scan", 25.6, 0.6], ["ping", 26.0, 0.5, 0.9],
  ["whoosh-cinematic", 26.4, 0.55, 1.2], ["impact-bass-2", 27.01, 0.8],
  ["sparkle", 29.03, 0.4],
];

// music: always present, ducked under the voice, short fade at the tail
// bed is mastered hot (-7.5 LUFS) vs voice (-17 LUFS): ~-23 LUFS in the gaps, ~-30 LUFS under the voice
const B = 0.16, D = 0.07, R = 0.12;
const pts = [{ t: 0, v: B }];
vo.forEach(([id, s]) => {
  const e = s + dur(`assets/voice/${id}.wav`);
  pts.push({ t: +(s - R).toFixed(3), v: B }, { t: +s.toFixed(3), v: D }, { t: +e.toFixed(3), v: D }, { t: +(e + R).toFixed(3), v: B });
});
pts.push({ t: 29.2, v: B }, { t: LEN, v: 0 });
// merge overlapping duck windows: keep points sorted and drop "back up" points that fall inside the next duck
pts.sort((a, b) => a.t - b.t);
const lane = pts.filter((p, i) => !(p.v === B && i > 0 && i < pts.length - 1 && pts[i - 1].v === D && pts[i + 1] && pts[i + 1].v === D));

const L = [];
L.push(`<audio id="music" src="assets/music.mp3" data-start="0" data-duration="${LEN}" data-track-index="10" data-volume="1" data-automation='${JSON.stringify({ version: 1, lanes: [{ target: "volume", points: lane }] })}'></audio>`);
vo.forEach(([id, s]) => L.push(`<audio id="vo-${id}" src="assets/voice/${id}.wav" data-start="${s}" data-duration="${dur(`assets/voice/${id}.wav`).toFixed(2)}" data-track-index="11" data-volume="1"></audio>`));
// greedy lane packing so no two SFX overlap on one track
const laneEnds = [];
sfx.forEach(([f, s, v, max], i) => {
  const d = Math.min(max ?? 9, dur(`assets/sfx/${f}.mp3`), LEN - s);
  let lane = laneEnds.findIndex((e) => e <= s);
  if (lane < 0) { lane = laneEnds.length; laneEnds.push(0); }
  laneEnds[lane] = s + d + 0.01;
  L.push(`<audio id="sfx-${String(i).padStart(2, "0")}-${f}" src="assets/sfx/${f}.mp3" data-start="${s}" data-duration="${d.toFixed(2)}" data-track-index="${12 + lane}" data-volume="${v}"></audio>`);
});

const html = readFileSync("index.html", "utf8");
const out = html.replace(/<!-- AUDIO:BEGIN -->[\s\S]*<!-- AUDIO:END -->/, `<!-- AUDIO:BEGIN -->\n      ${L.join("\n      ")}\n      <!-- AUDIO:END -->`);
writeFileSync("index.html", out);
console.log(`audio tags: ${L.length} (music + ${vo.length} vo + ${sfx.length} sfx)`);
