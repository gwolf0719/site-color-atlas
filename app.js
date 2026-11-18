const byId = (id) => document.getElementById(id);
const labels = {
  canvas: "頁面底色",
  surface: "卡片底色",
  text: "正文",
  muted: "次要文字",
  primary: "主色",
  onPrimary: "主色上的文字",
  accent: "點綴色",
  onAccent: "點綴上的文字",
};
const categories = ["全部", "品牌編輯", "數位產品", "商店生活"];
const params = new URLSearchParams(location.search);
let view = params.get("view") === "system" ? "system" : "site";
let category = "全部";
let palettes = [];
let selected;

function element(tag, content, className) {
  const node = document.createElement(tag);
  if (content) node.textContent = content;
  if (className) node.className = className;
  return node;
}
function pressed(node, value) {
  node.setAttribute("aria-pressed", String(value));
}

function paintBars(container, palette) {
  container.replaceChildren();
  for (const [role, width] of [
    ["primary", 36],
    ["accent", 28],
    ["text", 19],
    ["canvas", 17],
  ]) {
    const swatch = element("i");
    swatch.style.backgroundColor = palette.colors[role];
    swatch.style.flexGrow = width;
    container.append(swatch);
  }
}
function selectionUrl() {
  const url = new URL(location.href);
  url.searchParams.set("palette", selected.id);
  url.searchParams.set("view", view);
  url.hash = "preview";
  return url;
}
function updateUrl() {
  const url = selectionUrl();
  url.hash = location.hash;
  history.replaceState(null, "", url);
}
function renderCards() {
  const matches = palettes.filter(
    (p) =>
      (category === "全部" || p.category === category) &&
      (byId("mode").value === "全部明暗" || p.mode === byId("mode").value),
  );
  byId("count").textContent =
    matches.length + " / " + palettes.length + " 組配色";
  const catalog = byId("catalog");
  catalog.replaceChildren();
  for (const palette of matches) {
    const card = element("button", null, "card");
    card.dataset.id = palette.id;
    pressed(card, palette === selected);
    const bars = element("span", null, "bars");
    paintBars(bars, palette);
    const foot = element("span", null, "card-foot");
    foot.append(
      element("b", palette.name),
      element("span", palette.category + " · " + palette.mode),
    );
    card.append(bars, foot);
    card.onclick = () => {
      selected = palette;
      updateUrl();
      renderDetail();
      for (const button of catalog.children) pressed(button, button === card);
      byId("preview").focus({ preventScroll: true });
      byId("preview").scrollIntoView();
    };
    catalog.append(card);
  }
  if (!matches.length)
    catalog.append(element("p", "這個條件目前沒有色卡，請切換用途或明暗。"));
}

const website =
  '<div class="mocknav"><strong>在地編輯室</strong><span>地方誌　／　專題</span></div><div class="feature"><div><h4>沿著海線，<br>讀一座城。</h4><p>從港口的第一班渡輪，走進巷弄裡的老書店。</p><span class="mock-action">閱讀專題 ↗</span></div><div class="issue"><span class="mock-tag">秋季特刊</span><strong lang="en">Coast</strong><span>海岸線採集誌</span></div></div>';
const dashboard =
  '<div class="mocknav"><strong>專案總覽</strong><span class="mock-action">新增專案 ＋</span></div><div class="stats"><div class="stat"><p>進行中專案</p><b>12</b></div><div class="stat"><p>本週已交付</p><b>08</b></div><div class="stat"><p>待確認項目</p><span class="mock-tag">3 件待審</span></div></div>';

function luminance(hex) {
  const channels = hex
    .slice(1)
    .match(/../g)
    .map((pair) => parseInt(pair, 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
function contrast(first, second) {
  const [low, high] = [luminance(first), luminance(second)].sort(
    (a, b) => a - b,
  );
  return ((high + 0.05) / (low + 0.05)).toFixed(2);
}
function renderDemo() {
  byId("demo").innerHTML = view === "site" ? website : dashboard;
  for (const button of byId("views").children)
    pressed(button, button.dataset.view === view);
}
async function copy(value, result) {
  try {
    await navigator.clipboard.writeText(value);
    byId("feedback").textContent = result;
  } catch {
    window.prompt("請複製下方內容", value);
  }
}
function renderDetail() {
  const { name, description, mode, category, colors } = selected;
  byId("detail-meta").textContent = category + " ／ " + mode;
  byId("name").textContent = name;
  byId("note").textContent = description;
  byId("feedback").textContent = "";
  byId("tokens").replaceChildren();
  for (const [key, label] of Object.entries(labels)) {
    const color = colors[key];
    byId("demo").style.setProperty("--" + key, color);
    const button = element("button", null, "token");
    const chip = element("span", null, "chip");
    chip.style.backgroundColor = color;
    const caption = element("span", label);
    caption.append(element("small", color));
    button.append(chip, caption);
    button.setAttribute("aria-label", "複製" + label + " " + color);
    button.onclick = () => copy(color, "已複製 " + color);
    byId("tokens").append(button);
  }
  byId("contrast").textContent =
    "文字對比　正文／頁底 " +
    contrast(colors.text, colors.canvas) +
    "∶1　·　主按鈕 " +
    contrast(colors.onPrimary, colors.primary) +
    "∶1　·　點綴標籤 " +
    contrast(colors.onAccent, colors.accent) +
    "∶1";
  renderDemo();
}
async function init() {
  const response = await fetch("./palettes.json");
  if (!response.ok) throw Error("載入失敗");
  palettes = await response.json();
  selected =
    palettes.find((p) => p.id === params.get("palette")) || palettes[0];
  categories.forEach((label) => {
    const button = element("button", label);
    pressed(button, label === category);
    button.onclick = () => {
      category = label;
      for (const b of byId("filter").children) pressed(b, b === button);
      renderCards();
    };
    byId("filter").append(button);
  });
  byId("mode").onchange = renderCards;
  for (const button of byId("views").children)
    button.onclick = () => {
      view = button.dataset.view;
      updateUrl();
      renderDemo();
      byId("feedback").textContent = "";
    };
  byId("share").onclick = () => copy(selectionUrl().href, "已複製選色連結");
  byId("copy-css").onclick = () => {
    const properties = Object.entries(selected.colors).map(
      ([key, value]) =>
        "  --" +
        key.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase()) +
        ": " +
        value +
        ";",
    );
    copy(
      ["/* " + selected.name + " */", ":root {", ...properties, "}"].join("\n"),
      "已複製 8 個 CSS 變數",
    );
  };
  renderCards();
  renderDetail();
  if (location.hash === "#preview") byId("preview").scrollIntoView();
}
init().catch(() => {
  byId("catalog").textContent = "色卡載入失敗，請重新整理頁面。";
});
