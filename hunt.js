import { hsl, safe } from "./spectrum.mjs";
import { arrange, hueGap, ratio } from "./color-rules.mjs";
const id = (name) => document.getElementById(name);
const elt = (tag, text) => {
  const el = document.createElement(tag);
  el.textContent = text || "";
  return el;
};
export const huntUrl = (code) =>
  "https://colorhunt.co/palette/" + code.toLowerCase();

export function setupHunt(apply) {
  let items = [],
    sorted = [],
    page = 0,
    primary = "",
    style = "calm",
    activeKey = "";
  const size = 8;
  function rank() {
    const target = primary ? hsl(primary) : null;
    for (const item of items) {
      const distance = target
        ? Math.min(
            ...item.hues.map(
              (c) =>
                (hueGap(c[0], target[0]) / 180) * Math.min(c[1], target[1]) +
                Math.abs(c[2] - target[2]) * 0.9 +
                Math.abs(c[1] - target[1]) * 0.3,
            ),
          )
        : 0;
      const styleCost =
        style === "bold"
          ? (180 - item.span) / 180 + 1 / Math.max(1, item.contrast)
          : item.span / 180;
      item.score = distance * 4 + styleCost;
    }
    sorted =
      id("hunt-order").value === "new"
        ? [...items]
        : [...items].sort((a, b) => a.score - b.score);
    page = 0;
    draw();
  }
  function draw() {
    const grid = id("hunt-grid");
    grid.replaceChildren();
    for (const item of sorted.slice(page * size, (page + 1) * size)) {
      const article = elt("article");
      article.className = "hunt-card";
      const button = elt("button");
      button.className = "hunt-select";
      button.setAttribute("aria-label", "套用四色 " + item.colors.join(" "));
      const strip = elt("span");
      strip.className = "hunt-strip";
      for (const hex of item.colors) {
        const color = elt("i");
        color.style.background = hex;
        color.title = hex;
        strip.append(color);
      }
      const caption = elt("span", "套用四色 ↗");
      button.append(strip, caption);
      button.onclick = () => apply(arrange(item.colors), item.code);
      const link = elt("a", "原卡 ↗");
      link.href = huntUrl(item.code);
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      article.append(button, link);
      grid.append(article);
    }
    const pages = Math.ceil(sorted.length / size);
    id("hunt-page").textContent = page + 1 + " / " + pages;
    id("hunt-prev").disabled = page === 0;
    id("hunt-next").disabled = page + 1 >= pages;
  }
  id("hunt-prev").onclick = () => {
    if (page > 0) {
      page--;
      draw();
    }
  };
  id("hunt-next").onclick = () => {
    if ((page + 1) * size < sorted.length) {
      page++;
      draw();
    }
  };
  id("hunt-order").onchange = rank;
  fetch("./colorhunt.json?v=c49faa2")
    .then((r) => {
      if (!r.ok) throw Error("HTTP " + r.status);
      return r.json();
    })
    .then((snapshot) => {
      for (const code of snapshot.codes) {
        const colors = code.match(/.{6}/g).map((c) => "#" + c);
        if (!colors.every(safe)) continue;
        const hues = colors.map(hsl),
          vivid = hues.filter((c) => c[1] > 0.18);
        const span = Math.max(
          0,
          ...vivid.flatMap((a) => vivid.map((b) => hueGap(a[0], b[0]))),
        );
        const contrast = Math.max(
          ...colors.flatMap((a) => colors.map((b) => ratio(a, b))),
        );
        items.push({ code, colors, hues, span, contrast });
      }
      id("hunt-status").textContent =
        snapshot.retrieved +
        " 收錄 " +
        snapshot.codes.length.toLocaleString("zh-TW") +
        " 組原卡，依團隊色域篩出 " +
        items.length +
        " 組可套用。色帶沿用原卡順序。";
      rank();
    })
    .catch(() => {
      id("hunt-status").textContent =
        "色卡未載入，請重新整理或開啟完整色碼資料。";
    });
  return (nextPrimary, nextStyle) => {
    const key = nextPrimary + "|" + nextStyle;
    if (key === activeKey) return;
    primary = nextPrimary;
    style = nextStyle;
    activeKey = key;
    if (items.length) rank();
  };
}
