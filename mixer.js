import {
  roles,
  defaults,
  styles,
  cssRoles,
  ink,
  ratio,
} from "./color-rules.mjs";
import { huntUrl } from "./hunt.js";
import { layer, spectrum, safe } from "./spectrum.mjs";
import {
  LIMIT,
  letter,
  candidates,
  appendColor,
  adjust,
  removeLast,
  encode,
  decode,
  format,
} from "./mixer-data.mjs";

const el = (id) => document.getElementById(id);
const requested = new URL(location.href).searchParams.get("mix");
let picks = decode(requested);
const initial = new URL(location.href).searchParams;
let style = initial.get("style") === "bold" ? "bold" : "calm";
let names = [...defaults];
const savedRoles = (initial.get("roles") || "")
  .split("")
  .map((n) => roles[Number(n)]);
if (
  savedRoles.length === picks.length &&
  savedRoles.every((r) => roles.includes(r)) &&
  roles.slice(0, 3).every((r) => savedRoles.filter((v) => v === r).length <= 1)
)
  names.splice(0, picks.length, ...savedRoles);
let source = initial.get("hunt");
if (!/^[a-f0-9]{24}$/i.test(source || "")) source = null;
function mixParams(url) {
  for (const key of ["mix", "style", "roles", "hunt"])
    url.searchParams.delete(key);
  if (picks.length) {
    url.searchParams.set("mix", encode(picks));
    url.searchParams.set(
      "roles",
      names
        .slice(0, picks.length)
        .map((n) => roles.indexOf(n))
        .join(""),
    );
    if (source) url.searchParams.set("hunt", source);
  }
  if (style === "bold") url.searchParams.set("style", style);
  return url;
}
function rolePreview() {
  el("role-preview").hidden = !picks.length;
  if (!picks.length) return;
  const c = cssRoles(picks, names);
  const demo = el("role-preview");
  for (const [k, v] of Object.entries(c)) {
    demo.style.setProperty("--" + k, v);
    demo.style.setProperty("--ink-" + k, ink(v));
  }
  const hasBg = names.slice(0, picks.length).includes("背景");
  const hasPrimary = names.slice(0, picks.length).includes("主色");
  el("role-contrast").textContent =
    hasBg && hasPrimary
      ? "主色與背景對比 " +
        ratio(c.primary, c.bg).toFixed(2) +
        "∶1。" +
        (ratio(c.primary, c.bg) >= 4.5
          ? "此配對可用於一般文字。"
          : "主色適合色塊，內文使用預覽中的高對比字色。")
      : "預覽暫用預設值補足未指定的角色。";
}
let page = 0,
  browseAll = false;
let options = [],
  wheel = null,
  copyTicket = 0;
const make = (tag, text) => {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  return node;
};

function backgroundColor() {
  return picks[names.slice(0, picks.length).indexOf("背景")]?.hex;
}
function setBackground(hex) {
  if (!safe(hex)) {
    el("bg-feedback").textContent = "這個色碼在團隊排除範圍，請換一個色碼。";
    el("custom-bg").value = backgroundColor() || "#191622";
    return;
  }
  const bg = names.slice(0, picks.length).indexOf("背景"),
    match = picks.findIndex((p) => p.hex === hex);
  if (bg >= 0) {
    if (match >= 0 && match !== bg) {
      picks[match] = { ...picks[match], hex: picks[bg].hex };
    }
    picks[bg] = { ...picks[bg], hex };
  } else if (match >= 0) {
    names[match] = "背景";
  } else {
    if (picks.length === LIMIT) {
      el("bg-feedback").textContent = "請先在配置表將一色指定為背景。";
      return;
    }
    names[picks.length] = "背景";
    picks = appendColor(picks, hex);
  }
  el("bg-feedback").textContent = "";
  page = 0;
  updateLink();
  render();
}
function updateBackground(hex) {
  const stage = el("wheel-host").parentElement;
  stage.toggleAttribute("data-selected-bg", Boolean(hex));
  if (hex) {
    stage.style.setProperty("--canvas-base", hex);
    stage.style.setProperty("--canvas-ink", ink(hex));
    el("custom-bg").value = hex;
  }
  if(!hex)el("custom-bg").value="#191622";
  el("current-bg").textContent = hex ? "底色 " + hex : "底色未指定";
  for (const b of el("gray-swatches").children) {
    const selected =
      el("gray-action").value === "background"
        ? b.dataset.hex === hex
        : picks.some((p) => p.hex === b.dataset.hex);
    b.setAttribute("aria-pressed", String(selected));
  }
}
const grays = [
  ["黑", "#000000"],
  ["炭灰", "#242424"],
  ["深灰", "#404040"],
  ["鐵灰", "#606060"],
  ["中灰", "#808080"],
  ["銀灰", "#A0A0A0"],
  ["淺灰", "#C8C8C8"],
  ["淡灰", "#E8E8E8"],
  ["近白", "#FEFEFE"],
];
for (const [name, hex] of grays) {
  const b = make("button");
  b.className = "gray-swatch";
  b.dataset.hex = hex;
  b.style.setProperty("--swatch", hex);
  b.title = name + " " + hex;
  b.setAttribute("aria-label", name + " " + hex);
  b.onclick = () => {
    if (el("gray-action").value === "background") {
      setBackground(hex);
      return;
    }
    if (picks.some((p) => p.hex === hex)) {
      el("bg-feedback").textContent = "這個灰階已在配置表中。";
      return;
    }
    if (picks.length === LIMIT) {
      el("bg-feedback").textContent = "目前已選八色。";
      return;
    }
    el("bg-feedback").textContent = "";
    choose(hex);
  };
  el("gray-swatches").append(b);
}
el("gray-action").onchange = () => {
  el("bg-feedback").textContent = "";
  updateBackground(backgroundColor());
};
el("custom-bg").onchange = () =>
  setBackground(el("custom-bg").value.toUpperCase());
function hover(candidate) {
  el("hover-code").textContent =
    candidate?.hex || (picks.length === LIMIT ? "100%" : "");
}
function updateLink() {
  const url = new URL(location.href);
  mixParams(url);
  history.replaceState(null, "", url);
}
function choose(hex) {
  const next = appendColor(picks, hex);
  if (next === picks) return;
  const used = names.slice(0, picks.length);
  names[picks.length] =
    defaults.find((r) => r !== "其他" && !used.includes(r)) || "其他";
  picks = next;
  page = 0;
  browseAll = false;
  updateLink();
  render();
}
function refreshOutput() {
  const list = el("allocations"),
    bar = el("proportion");
  list.replaceChildren();
  bar.replaceChildren();
  for (const [i, pick] of picks.entries()) {
    const part = make("span");
    part.style.width = pick.percent + "%";
    part.style.background = pick.hex;
    part.title = letter(i) + " " + pick.hex + " " + pick.percent + "%";
    bar.append(part);
    const row = make("div");
    row.className = "allocation";
    const dot = make("i");
    dot.style.background = pick.hex;
    const label = make("label", letter(i) + " " + names[i]);
    label.htmlFor = "percent-" + i;
    label.append(make("code", pick.hex));
    const input = make("input");
    input.id = label.htmlFor;
    input.type = "number";
    input.inputMode = "numeric";
    input.min = 1;
    input.max = 101 - picks.length;
    input.value = pick.percent;
    input.disabled = picks.length === 1;
    input.setAttribute("aria-label", letter(i) + " " + names[i] + "面積百分比");
    let startingWeights;
    input.onfocus = () => {
      startingWeights = picks;
    };
    input.oninput = () => {
      const value = input.valueAsNumber;
      if (!Number.isFinite(value)) return;
      picks = adjust(startingWeights || picks, i, value);
      updateLink();
      // 保留目前輸入框與焦點，讓鍵盤可連續調整。
      [...list.querySelectorAll("input")].forEach(
        (field, j) => (field.value = picks[j].percent),
      );
      [...bar.children].forEach((span, j) => {
        span.style.width = picks[j].percent + "%";
        span.title =
          letter(j) + " " + picks[j].hex + " " + picks[j].percent + "%";
      });
      wheel?.update(options, picks, backgroundColor());
      copyTicket++;
      el("mix-feedback").textContent = "比例已調整，合計 100%。";
    };
    input.onblur = () => {
      input.value = picks[i].percent;
      startingWeights = null;
    };
    const role = make("select");
    role.setAttribute("aria-label", letter(i) + " 色彩角色");
    for (const text of roles) {
      const opt = make("option", text);
      opt.selected = text === names[i];
      role.append(opt);
    }
    role.onchange = () => {
      const former = names[i],
        other = names.slice(0, picks.length).indexOf(role.value);
      if (other !== -1 && other !== i && role.value !== "其他")
        names[other] = former;
      names[i] = role.value;
      updateLink();
      render();
    };
    row.append(dot, label, role, input, make("span", "%"));
    list.append(row);
  }
  for (const id of ["undo", "reset", "copy-mix", "share-mix"])
    el(id).disabled = !picks.length;
  el("mix-empty").hidden = Boolean(picks.length);
  el("find-hunt").hidden = !names.slice(0,picks.length).includes("主色");
}
function render() {
  copyTicket++;
  const roleSet = names.slice(0, picks.length);
  const background = picks[roleSet.indexOf("背景")]?.hex;
  const whole = !roleSet.includes("主色") || browseAll;
  updateBackground(background);
  const full = picks.length === LIMIT;
  const nextRole =
    defaults.find(
      (r) => r !== "其他" && !names.slice(0, picks.length).includes(r),
    ) || "點綴色";
  const title = el("mix-title"),
    lead = !picks.length ? "選一個" : full ? "配色" : "加入";
  const emphasis = full ? "完成。" : nextRole + "。";
  if (title.dataset.caption !== lead + emphasis) {
    title.replaceChildren(
      document.createTextNode(lead),
      document.createElement("br"),
      make("em", emphasis),
    );
    title.dataset.caption = lead + emphasis;
  }
  const primary =
    picks[names.slice(0, picks.length).indexOf("主色")]?.hex || picks[0]?.hex;
  const directory = mixParams(new URL("library.html", location.href));
  el("open-library").href = directory.href;
  directory.hash = "hunt";
  el("find-hunt").href = directory.href;
  for (const b of el("directions").children)
    b.setAttribute("aria-pressed", String(b.dataset.style === style));
  el("style-tip").textContent =
    style === "calm"
      ? "同色與鄰近色延續視覺，利用明暗分出層次。"
      : "以對照色拉開色相與明度，強調主要操作與重點。";
  const pool = full
    ? []
    : whole
      ? layer(
          Number(el("lightness").value),
          Number(el("saturation").value),
        ).filter((c) => !picks.some((p) => p.hex === c.hex))
      : candidates(picks, style, primary);
  const size = 12,
    pages = Math.ceil(pool.length / size);
  page = pages ? page % pages : 0;
  options = whole ? pool : pool.slice(page * size, (page + 1) * size);
  el("tones").hidden = !whole || full;
  el("more-colors").hidden = whole || full;
  el("more-colors").textContent =
    "下一批推薦（" + (page + 1) + "／" + pages + "）";
  el("switch-colors").hidden = !roleSet.includes("主色") || full;
  el("switch-colors").textContent = whole ? "回推薦配色" : "瀏覽全色環";
  el("brand-color").hidden = full;
  el("hex-feedback").textContent = "";
  hover(null);
  el("instruction").textContent = !roleSet.includes("主色")
    ? "從 " +
      spectrum.length.toLocaleString("zh-TW") +
      " 個色階挑選主色。切換明度與彩度，或直接點選色環。"
    : full
      ? "八個顏色已選齊。到下方調整面積比例，即可複製配置表。"
      : "點選色環或下方推薦色加入 " +
        letter(picks.length) +
        " 色。新增顏色會以較小面積加入。";
  el("hub-role").textContent = full
    ? "配置完成"
    : picks.length
      ? nextRole
      : "選取主色";
  el("hub-letter").textContent = full ? "8" : letter(picks.length);
  el("choice-label").textContent = whole ? "色環選項" : "推薦配色";
  el("recommendations").replaceChildren();
  el("color-choice").replaceChildren();
  for (const choice of options) {
    const opt = make("option", choice.name + " " + choice.hex);
    opt.value = choice.hex;
    el("color-choice").append(opt);
    if (!whole) {
      const button = make("button");
      button.className = "rec";
      button.setAttribute(
        "aria-label",
        "加入" + choice.name + " " + choice.hex,
      );
      const chip = make("i");
      chip.style.background = choice.hex;
      button.append(chip, make("span", choice.name));
      button.title = choice.hex;
      button.onclick = () => choose(choice.hex);
      el("recommendations").append(button);
    }
  }
  el("color-choice").disabled = full;
  el("add-color").disabled = full;
  el("add-color").textContent = roleSet.includes("主色") ? "加入搭配色" : "設為主色";
  const bands = options.length
    ? options.map((c) => ({ ...c, percent: 100 / options.length }))
    : picks;
  let position = 0;
  const stops = bands.map((c) => {
    const from = position;
    position += c.percent;
    return c.hex + " " + from + "% " + position + "%";
  });
  el("ring-fallback").style.background =
    "conic-gradient(" + stops.join(",") + ")";
  wheel?.update(options, picks, backgroundColor());
  el("mix-feedback").textContent = "";
  refreshOutput();
  rolePreview();
}
function fallbackHit(e) {
  const rect = el("ring-fallback").getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width - 0.5,
    y = (e.clientY - rect.top) / rect.height - 0.5;
  const r = Math.hypot(x, y);
  if (r < 0.18 || r > 0.5) return null;
  const turn = (Math.atan2(x, -y) / (2 * Math.PI) + 1) % 1;
  return options[Math.floor(turn * options.length)];
}
el("ring-fallback").onclick = (e) => {
  const c = fallbackHit(e);
  if (c) choose(c.hex);
};
el("ring-fallback").onpointermove = (e) => hover(fallbackHit(e));
el("ring-fallback").onpointerleave = () => hover(null);
el("add-color").onclick = () => choose(el("color-choice").value);
el("lightness").onchange = render;
el("saturation").onchange = render;
el("more-colors").onclick = () => {
  page++;
  render();
};
el("switch-colors").onclick = () => {
  browseAll = !browseAll;
  page = 0;
  render();
};
el("hex-form").onsubmit = (e) => {
  e.preventDefault();
  const hex =
    "#" + el("custom-hex").value.trim().replace(/^#/, "").toUpperCase();
  if (!/^#[A-F0-9]{6}$/.test(hex)) {
    el("hex-feedback").textContent = "請輸入 6 位 HEX 色碼。";
    return;
  }
  if (!safe(hex)) {
    el("hex-feedback").textContent = "這個色碼落在團隊排除的色域，請調整色碼。";
    return;
  }
  if (picks.some((p) => p.hex === hex)) {
    el("hex-feedback").textContent = "這個色碼已在配置表中。";
    return;
  }
  el("custom-hex").value = "";
  el("brand-color").open = false;
  choose(hex);
};
el("undo").onclick = () => {
  page = 0;
  browseAll = false;
  picks = removeLast(picks);
  if (!picks.length) source = null;
  updateLink();
  render();
};
el("reset").onclick = () => {
  picks = [];
  names = [...defaults];
  source = null;
  page = 0;
  browseAll = false;
  updateLink();
  render();
};
async function copy(text, success) {
  const ticket = ++copyTicket;
  try {
    await navigator.clipboard.writeText(text);
    if (ticket === copyTicket) el("mix-feedback").textContent = success;
  } catch {
    window.prompt("請複製下方內容", text);
  }
}
el("copy-mix").onclick = () => {
  const lines = [format(picks, names), "配色方向：" + styles[style]];
  if (source) lines.push("色卡參考：" + huntUrl(source));
  copy(lines.join("\n"), "已複製整段配置表。");
};
for (const button of el("directions").children)
  button.onclick = () => {
    style = button.dataset.style;
    page = 0;
    updateLink();
    render();
  };
el("share-mix").onclick = () => {
  const url = new URL(location.href);
  url.search = "";
  mixParams(url);
  url.hash = "mixer";
  copy(url.href, "已複製配色與比例連結。");
};
render();
import("./ring.js")
  .then(({ createWheel }) => {
    const fallback = el("ring-fallback");
    wheel = createWheel(el("wheel-host"), choose, hover, () => {
      wheel = null;
      fallback.hidden = false;
    });
    wheel.update(options, picks, backgroundColor());
    fallback.hidden = true;
  })
  .catch(() => {
    el("ring-fallback").hidden = false;
  });
