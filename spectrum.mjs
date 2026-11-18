// 色環分層與 HEX 審核共用同一套 sRGB / HSL 轉換。
const blocked = new Set(
  "274A60 526B79 884934 5B4C45 323538 82582F 304A38 626044 544459 675E6E F4F5F7 FFFFFF EAECEF 20252D 515966 DFE1E5 733731 873E37 F0F2F5 E1E7EF 202A36 4D5A68 CDD5DE 293F59 784940 F1F1F2 E3E1E0 292524 56504D D4D2D2 503A32 805345 F2F3F4 E8E9EB 282C27 4E5750 D2D6D7 414C34 7B4236 F3F2F4 E8E6EB 2C2630 564E5D D6D1DB 4F3B50 743D51".split(
    " ",
  ),
);
export const lightness = [18, 29, 40, 50, 62, 74];
export const saturation = [16, 30, 44, 58];
const names = [
  "正紅",
  "朱紅",
  "橘",
  "琥珀",
  "金黃",
  "黃綠",
  "草綠",
  "嫩綠",
  "葉綠",
  "翠綠",
  "碧綠",
  "青綠",
  "青",
  "湖藍",
  "海藍",
  "靛藍",
  "正藍",
  "藍紫",
  "鳶尾紫",
  "蘭紫",
  "紫紅",
  "洋紅",
  "玫紅",
  "胭脂",
];
export function luminance(hex) {
  const rgb = hex
    .slice(1)
    .match(/../g)
    .map((v) => parseInt(v, 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
export function ratio(a, b) {
  const [low, high] = [luminance(a), luminance(b)].sort((x, y) => x - y);
  return (high + 0.05) / (low + 0.05);
}

export function hsl(hex) {
  const [r, g, b] = hex
    .slice(1)
    .match(/../g)
    .map((c) => parseInt(c, 16) / 255);
  const hi = Math.max(r, g, b),
    lo = Math.min(r, g, b),
    d = hi - lo,
    l = (hi + lo) / 2;
  if (!d) return [0, 0, l];
  const h =
    hi === r ? (g - b) / d : hi === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(((60 * h) % 360) + 360) % 360, d / (1 - Math.abs(2 * l - 1)), l];
}
export function safe(hex) {
  if (!/^#[0-9A-F]{6}$/i.test(hex) || blocked.has(hex.slice(1).toUpperCase()))
    return false;
  const [h, s, l] = hsl(hex);
  if (h >= 28 && h <= 68 && s > 0.06 && l > 0.82) return false;
  if (h >= 128 && h <= 183 && s > 0.075 && l > 0.6) return false;
  if (s > 0.8 && l > 0.43 && l < 0.76) return false;
  if (h >= 54 && h <= 160 && s > 0.6 && l > 0.47 && l < 0.81) return false;
  return true;
}
export function color(h, s, l) {
  s /= 100;
  l /= 100;
  const part = (n) => {
    const k = (n + h / 30) % 12;
    const c =
      l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(c * 255)
      .toString(16)
      .padStart(2, "0");
  };
  return ("#" + part(0) + part(8) + part(4)).toUpperCase();
}
export const spectrum = [];
for (let h = 0; h < 360; h += 7.5) {
  for (const l of lightness)
    for (const s of saturation) {
      const hex = color(h, s, l);
      if (safe(hex))
        spectrum.push({
          hex,
          h,
          l,
          s,
          name: names[Math.floor(h / 15)] + " " + h + "°",
        });
    }
}
export function layer(l, s) {
  return spectrum.filter((c) => c.l === l && c.s === s);
}
const hueDifference = (a, b) => Math.abs(((a - b + 540) % 360) - 180);
export function harmonies(picks, primary = picks[0].hex) {
  const [baseHue, , baseLight] = hsl(primary),
    [lastHue] = hsl(picks.at(-1).hex);
  const taken = new Set(picks.map((p) => p.hex));
  const offsets = [0, 12, 180, -12, 24, 150, -24, 7, 210, 32, -32, 4];
  const anchors = offsets.map((offset, i) => [
    (i === 11 && hueDifference(lastHue, baseHue) < 25 ? lastHue : baseHue) +
      offset,
    offset === 180
      ? "互補"
      : offset >= 150
        ? "分裂互補"
        : Math.abs(offset) < 10
          ? "同色調"
          : "鄰近色",
  ]);
  const targetLs =
    baseLight > 0.5 ? [18, 29, 40, 50, 62, 74] : [74, 62, 50, 40, 29, 18];
  const list = [];
  for (const [k, l] of targetLs.entries()) {
    for (const [i, [angle, relation]] of anchors.entries()) {
      const hue = (angle + 720) % 360,
        s = saturation[(i + k) % saturation.length];
      let best = null,
        score = Infinity;
      for (const c of spectrum) {
        if (taken.has(c.hex)) continue;
        const diff =
          hueDifference(c.h, hue) +
          Math.abs(c.l - l) * 1.6 +
          Math.abs(c.s - s) * 0.3;
        if (diff < score) {
          best = c;
          score = diff;
        }
      }
      if (!best) return list;
      taken.add(best.hex);
      list.push({ ...best, name: relation + "・" + best.name.split(" ")[0] });
    }
  }
  return list;
}
