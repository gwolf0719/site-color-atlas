import { defaults } from "./color-rules.mjs";
import { safe, layer, harmonies } from "./spectrum.mjs";
// 依色相排列，固定色值讓分享連結與複製結果一致。
export const families = [
  ["櫻桃紅", "AD254A", "D9A4BA", "9BAED4", "F6E9EF", "341C2C"],
  ["朱砂", "B3443E", "D89C92", "7DA4BC", "F4EAE9", "382129"],
  ["柑橘", "C66930", "E8AB72", "829AC7", "F1E9ED", "382524"],
  ["金盞", "D5A342", "B092C3", "6F5389", "EDEAF3", "271E30"],
  ["麥穗", "B69C4A", "D7C68B", "826D9B", "E9EBF2", "292538"],
  ["青梨", "92A64A", "BDC983", "A475A0", "EFEAF1", "2D2935"],
  ["草葉", "548447", "A7BB87", "CA8A9F", "E9EBF0", "252C2A"],
  ["孔雀青", "237D73", "D7A64F", "7196C3", "E9ECF3", "15292E"],
  ["湖藍", "247E9A", "E3A27C", "94B7D2", "E8EFF7", "1E2939"],
  ["海港藍", "185D91", "EDB18B", "9FB9ED", "E8EFF7", "17263D"],
  ["群青", "4659A8", "D9A171", "A5B5DB", "E8EBF9", "191C3B"],
  ["鳶尾", "6951A2", "B2A2CA", "CEAA72", "EEEBFA", "241935"],
  ["蘭紫", "854B95", "C89CB7", "A5B981", "F4EAF2", "35223C"],
  ["玫瑰", "A54779", "DEA3BA", "89A5C1", "F6EBF2", "30152D"],
].map(([name, ...values]) => ({ name, colors: values.map((v) => "#" + v) }));

export const LIMIT = 8;
export const allColors = new Set(families.flatMap((f) => f.colors));
export const letter = (i) => String.fromCharCode(65 + i);
const rgb = (hex) =>
  hex
    .slice(1)
    .match(/../g)
    .map((x) => parseInt(x, 16) / 255);
function distance(a, b) {
  const x = rgb(a),
    y = rgb(b);
  return Math.sqrt(x.reduce((s, v, i) => s + (v - y[i]) ** 2, 0) / 3);
}
export function candidates(picks, primary) {
  if (!picks.length) return layer(40, 44);
  if (picks.length >= LIMIT) return [];
  return harmonies(picks, primary);
}
function canAdd(picks, hex) {
  return (
    picks.length < LIMIT &&
    (allColors.has(hex) || safe(hex)) &&
    !picks.some((p) => p.hex === hex)
  );
}
// 最大餘數法保證各色至少 1%，整數總和恆為 100%。
function distribute(weights, total, minimum = 1) {
  if (!weights.length) return [];
  const free = total - minimum * weights.length;
  const sum = weights.reduce((a, b) => a + b, 0);
  const shares = weights.map((w) => minimum + (free * w) / sum);
  const result = shares.map(Math.floor);
  const order = shares
    .map((v, i) => ({ i, rest: v - result[i] }))
    .sort((a, b) => b.rest - a.rest);
  const left = total - result.reduce((a, b) => a + b, 0);
  for (let i = 0; i < left; i++) result[order[i].i]++;
  return result;
}
export function appendColor(picks, hex) {
  if (!canAdd(picks, hex)) return picks;
  if (!picks.length) return [{ hex, percent: 100 }];
  const previous = picks.at(-1).percent;
  const factor = 0.53 - 0.18 * distance(hex, picks[0].hex);
  const share = Math.max(
    1,
    Math.min(
      Math.floor((99 * previous) / (100 + previous)),
      Math.round(previous * factor),
    ),
  );
  const rescaled = distribute(
    picks.map((p) => p.percent),
    100 - share,
  );
  return [
    ...picks.map((p, i) => ({ ...p, percent: rescaled[i] })),
    { hex, percent: share },
  ];
}
export function adjust(picks, index, percent) {
  if (picks.length < 2 || !Number.isFinite(percent)) return picks;
  const amount = Math.max(1, Math.min(101 - picks.length, Math.round(percent)));
  if (picks[index].percent === amount) return picks;
  const rest = picks.filter((_, i) => i !== index);
  const others = distribute(
    rest.map((p) => p.percent),
    100 - amount,
  );
  return picks.map((p, i) => ({
    ...p,
    percent: i === index ? amount : others.shift(),
  }));
}
export function removeColor(picks, hex) {
  const rest = picks.filter((p) => p.hex !== hex);
  if (rest.length === picks.length) return picks;
  const scaled = distribute(
    rest.map((p) => p.percent),
    100,
    0,
  );
  return rest.map((p, i) => ({ ...p, percent: scaled[i] }));
}
export function removeLast(picks) {
  return removeColor(picks, picks.at(-1)?.hex);
}
export function encode(picks) {
  return picks.map((p) => p.hex.slice(1) + "-" + p.percent).join(".");
}
export function decode(value) {
  if (!value || value.length > 100) return [];
  const entries = value.split(".");
  if (entries.length > LIMIT) return [];
  const picks = [];
  for (const entry of entries) {
    const m = /^([0-9A-F]{6})-(\d{1,3})$/i.exec(entry);
    if (!m) return [];
    const hex = "#" + m[1].toUpperCase(),
      percent = Number(m[2]);
    if (!canAdd(picks, hex) || percent < 1 || percent > 100) return [];
    picks.push({ hex, percent });
  }
  return picks.reduce((s, p) => s + p.percent, 0) === 100 ? picks : [];
}
export function format(picks, names = defaults) {
  return [
    "網站配色配置表",
    "請使用以下色碼設計介面。品牌與裝飾用色限於這份清單，百分比為建議的視覺面積。",
    ...picks.map(
      (p, i) =>
        letter(i) + " " + names[i] + " " + p.hex + "　" + p.percent + "%",
    ),
    "合計 100%",
  ].join("\n");
}
