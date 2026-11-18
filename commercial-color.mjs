import { hsl, color, ratio, safe } from "./spectrum.mjs";
import { ink } from "./color-rules.mjs";

export const contexts = {
  general: {
    name: "通用",
    usage: "請保留已選的角色與 HEX，版面依指定比例分配用色。",
  },
  brand: {
    name: "品牌官網",
    usage: "主色重複用在品牌識別與主標題，讓不同頁面使用同一個品牌線索。",
  },
  shop: {
    name: "商品導購",
    usage:
      "主色集中在購買按鈕，同畫面的次要連結採正文色與底線，讓主要行動有清楚的層級。",
  },
  system: {
    name: "資訊系統",
    usage: "主色標記目前操作，狀態同時使用文字與數量，讓使用者也能從字義判讀。",
  },
};

function readable(bg, picks) {
  const best = picks
    .map((p) => p.hex)
    .filter((hex) => ratio(hex, bg) >= 4.5)
    .sort((a, b) => ratio(b, bg) - ratio(a, bg))[0];
  if (best) return best;
  const neutral = ink(bg);
  return ratio(bg, neutral) >= 4.5 ? neutral : "#000000";
}
export function quieterPrimary(picks, names) {
  const primary = picks[names.indexOf("主色")];
  if (!primary) return null;
  const [h, s, l] = hsl(primary.hex);
  if (s < 0.08) return null;
  const sample = color(h, s * 55, l * 100);
  return safe(sample) && !picks.some((p) => p.hex === sample) ? sample : null;
}
export function brief(picks, names, context, variant) {
  const use = contexts[Object.hasOwn(contexts, context) ? context : "brand"];
  const primary = picks[names.indexOf("主色")],
    bg = picks[names.indexOf("背景")]?.hex;
  const lines =
    use === contexts.general
      ? [use.usage]
      : ["商業用途：" + use.name, use.usage];
  if (!primary || !bg)
    return {
      use,
      lines: [...lines, "未指定的角色沿用既有設定，新增色碼前請先詢問。"],
    };
  const accent = variant || primary.hex;
  const samplePicks = variant
    ? picks.map((p) => (p === primary ? { ...p, hex: variant } : p))
    : picks;
  const body = readable(bg, samplePicks),
    onAccent = readable(accent, samplePicks);
  const edge = ratio(accent, bg) < 3 ? body : accent;
  lines.push(
    "主色 " +
      accent +
      " 占 " +
      primary.percent +
      "%，底色 " +
      bg +
      "。正文用 " +
      body +
      "（" +
      ratio(body, bg).toFixed(2) +
      "∶1），主色色塊上的字用 " +
      onAccent +
      "（" +
      ratio(onAccent, accent).toFixed(2) +
      "∶1）。",
  );
  if (edge !== accent)
    lines.push("主色色塊與底色接近，以 " + edge + " 描邊標出邊界。");
  return { use, lines, accent, bg, body, onAccent, edge };
}

export function renderCommercial(picks, names, context, compare) {
  const id = (key) => document.getElementById(key);
  const variant = quieterPrimary(picks, names);
  const saved = brief(picks, names, context);
  const alternate = compare && variant && saved.bg;
  const shown = alternate ? brief(picks, names, context, variant) : saved;

  id("chroma-tools").hidden = !saved.bg || !variant;
  id("try-chroma").textContent = alternate ? "看原主色" : "試看較低彩度";
  id("try-chroma").setAttribute("aria-pressed", String(Boolean(alternate)));
  id("apply-chroma").hidden = !alternate;
  id("business-note").textContent = shown.lines
    .slice(shown.use === contexts.general ? 0 : 1)
    .join(" ");
  return alternate ? variant : null;
}
