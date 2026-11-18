import { safe, hsl } from "./spectrum.mjs";
import { arrange, hueGap } from "./color-rules.mjs";

export const huntUrl = (code) =>
  "https://colorhunt.co/palette/" + code.toLowerCase();
let references = [];
async function read(path) {
  try {
    const response = await fetch(path);
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}
export async function loadReferences() {
  const [team, snapshot] = await Promise.all([
    read("./palettes.json?v=c49faa2"),
    read("./colorhunt.json?v=c49faa2"),
  ]);
  const ordered = (team || []).map(({ colors: c }) => [
    c.primary,
    c.canvas,
    c.accent,
    c.text,
  ]);
  for (const code of snapshot?.codes || []) {
    const colors = code.match(/.{6}/g).map((c) => "#" + c);
    if (colors.every(safe)) ordered.push(arrange(colors));
  }
  references = ordered.map((colors) => ({ colors, hsl: hsl(colors[0]) }));
  return team || [];
}
export function referenceMatches(primary, role, picks) {
  const [h, s, l] = hsl(primary),
    used = new Set(picks.map((p) => p.hex));
  const distance = (r) =>
    (hueGap(h, r.hsl[0]) / 180) * Math.min(s, r.hsl[1]) +
    Math.abs(l - r.hsl[2]) * 0.9 +
    Math.abs(s - r.hsl[1]) * 0.3;
  const nearest = references
    .map((r) => ({ r, d: distance(r) }))
    .sort((a, b) => a.d - b.d);
  const result = [];
  const position = role === "背景" ? 1 : role === "輔助色" ? 2 : 3;
  for (const { r } of nearest) {
    const hex = r.colors[position];
    if (used.has(hex) || !safe(hex)) continue;
    used.add(hex);
    result.push({ hex, name: "參考搭配" });
    if (result.length === 2) break;
  }
  return result;
}
