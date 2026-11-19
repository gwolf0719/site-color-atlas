/*
 * 檔案功能：配色標本室前端主控制器，串聯全視窗 3D 出血色環、左側單軸比例配置、即時底色浸潤、網址狀態與 AI 配置表匯出。
 * 相依性：依賴 motion-studio.mjs、live-proof.mjs、commercial-color.mjs、paper-interactions.mjs、color-rules.mjs、hunt.js、spectrum.mjs、mixer-data.mjs 與 ring.js。
 */
import {
  showStudy,
  proofColors,
  collectChip,
  cancelFlight,
  turnPage,
} from "./motion-studio.mjs";
import {
  nextRole,
  backgroundSample,
  paintDesk,
  bindPreview,
} from "./live-proof.mjs";
import {
  brief,
  contexts,
  quieterPrimary,
  renderCommercial,
} from "./commercial-color.mjs";

import { drawProof, seamControls } from "./paper-interactions.mjs";
import { roles, defaults, cssRoles, ink, ratio } from "./color-rules.mjs";
import { huntUrl, loadReferences, referenceMatches } from "./hunt.js";
import { layer, safe } from "./spectrum.mjs";
import {
  LIMIT,
  families,
  letter,
  candidates,
  appendColor,
  adjust,
  removeColor,
  encode,
  decode,
  format,
} from "./mixer-data.mjs";

const el = (id) => document.getElementById(id);
const requested = new URL(location.href).searchParams.get("mix");
let picks = decode(requested);
const initial = new URL(location.href).searchParams;
let businessUse = Object.hasOwn(contexts, initial.get("use"))
  ? initial.get("use")
  : initial.get("view") === "system"
    ? "system"
    : requested
      ? "brand"
      : "general";
let chromaTrial = false;
el("business-use").value = businessUse;
function businessProof() {
  const variant = renderCommercial(picks, names, businessUse, chromaTrial);
  if (!el("recipe-sheet").hidden) {
    const primary = names.indexOf("主色");
    paintDesk(
      variant
        ? picks.map((p, i) => (i === primary ? { ...p, hex: variant } : p))
        : picks,
      names,
    );
  }
}
el("business-use").onchange = () => {
  businessUse = el("business-use").value;
  chromaTrial = false;
  updateLink();
  businessProof();
  endTrial();
  copyTicket++;
  el("mix-feedback").textContent = el("desk-feedback").textContent = "";
};
el("try-chroma").onclick = () => {
  chromaTrial = !chromaTrial;
  businessProof();
};
el("apply-chroma").onclick = () => {
  const variant = quieterPrimary(picks, names);
  if (!variant) return;
  const index = names.indexOf("主色");
  picks = picks.map((p, i) => (i === index ? { ...p, hex: variant } : p));
  page = 0;
  updateLink();
  render();
};
if (initial.has("style")) {
  const url = new URL(location.href);
  url.searchParams.delete("style");
  history.replaceState(null, "", url);
}
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
  for (const key of ["mix", "style", "roles", "hunt", "use"])
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
  if (picks.length || businessUse !== "general")
    url.searchParams.set("use", businessUse);
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
  const badge = el("wcag-badge");
  if (hasBg && hasPrimary) {
    const contrast = ratio(c.primary, c.bg);
    const grade =
      contrast >= 7
        ? ["aaa", "AAA " + contrast.toFixed(2) + "∶1"]
        : contrast >= 4.5
          ? ["aa", "AA " + contrast.toFixed(2) + "∶1"]
          : contrast >= 3
            ? ["large", "大字 " + contrast.toFixed(2) + "∶1"]
            : ["decor", "裝飾 " + contrast.toFixed(2) + "∶1"];
    badge.hidden = false;
    badge.dataset.grade = grade[0];
    badge.textContent = grade[1];
    el("role-contrast").textContent =
      contrast >= 4.5
        ? "可讀性達標，主色與背景可直接用於內文與介面文字。"
        : contrast >= 3
          ? "適合大標題、圖示或按鈕色塊，小字內文請另配高對比字色。"
          : "對比偏低，建議僅用於大面積色塊或裝飾，勿作為文字色。";
  } else {
    badge.hidden = true;
    el("role-contrast").textContent =
      "指定主色與背景後，這裡會顯示 WCAG 對比度與實境元件預覽。";
  }
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
    el("custom-bg").value = backgroundColor() || "#ECECEE";
    return;
  }
  const next = backgroundSample(picks, names, hex);
  if (!next) {
    el("bg-feedback").textContent = "請先在配置表將一色指定為背景。";
    return;
  }
  picks = next.picks;
  names = [...next.roles, ...defaults.slice(next.roles.length)];
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
  if (!hex) el("custom-bg").value = "#ECECEE";
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
  bindPreview(
    b,
    () =>
      hover(
        { hex },
        true,
        el("gray-action").value === "background" ? "background" : "add",
      ),
    () => hover(null),
  );
  b.onclick = () => {
    if (el("gray-action").value === "background") {
      if (backgroundColor() === hex) removeSelected(hex);
      else setBackground(hex);
      return;
    }
    if (picks.some((p) => p.hex === hex)) {
      removeSelected(hex);
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
let pinned = false,
  trial = null;
function trialProof(hex, action = "add", group) {
  let sample = picks,
    sampleRoles = names.slice(0, picks.length),
    caption = "",
    role = "";
  if (group) {
    sample = group.reduce(appendColor, []);
    sampleRoles = defaults.slice(0, sample.length);
    caption = "試放整組 " + sample.length + " 色";
  } else if (hex) {
    if (action === "background") {
      const next = backgroundSample(picks, names, hex);
      if (next) {
        sample = next.picks;
        sampleRoles = next.roles;
      }
    } else if (!picks.some((p) => p.hex === hex)) {
      sample = appendColor(picks, hex);
      if (sample !== picks) sampleRoles.push(nextRole(picks, names));
    }
    const i = sample.findIndex((p) => p.hex === hex);
    if (i >= 0) role = sampleRoles[i];
    if (i >= 0)
      caption =
        "試放" + sampleRoles[i] + " " + hex + " · " + sample[i].percent + "%";
  }
  proofColors(sample, sampleRoles, hex);
  drawProof(picks, sample, caption, sampleRoles);
  const stage = el("wheel-host").parentElement;
  const root = document.documentElement;
  const bg = sample[sampleRoles.indexOf("背景")]?.hex;
  const tryBg = !!bg && bg !== backgroundColor();
  stage.toggleAttribute("data-trial-bg", tryBg);
  if (bg) {
    root.style.setProperty("--stage-bg", bg);
    root.style.setProperty("--stage-ink", ink(bg));
  } else {
    root.style.removeProperty("--stage-bg");
    root.style.removeProperty("--stage-ink");
  }
  if (tryBg) {
    stage.style.setProperty("--trial-base", bg);
    stage.style.setProperty("--trial-ink", ink(bg));
  }
  wheel?.setBackdrop(bg);
  paintDesk(sample, sampleRoles, role === "其他" ? hex : null);
}
let suppressHover = false;
document.addEventListener("pointermove", () => {
  suppressHover = false;
});
function hover(candidate, show = false, action = "add") {
  if (show && suppressHover) return;
  el("hover-code").textContent = candidate?.hex || "";
  if (pinned && show) endTrial();
  if (pinned) return;
  const hex = show ? candidate?.hex : null,
    key = hex ? action + hex : null;
  if (key === trial) return;
  trial = key;
  trialProof(hex, action);
}
const strip = el("proof-strip");
function pointAtChosen(e) {
  const chip = e.target.closest("[data-remove-hex]");
  if (!chip || pinned || trial) return;
  const i = picks.findIndex((p) => p.hex === chip.dataset.removeHex);
  if (i < 0) return;
  el("hover-code").textContent = names[i] + " " + picks[i].hex;
  paintDesk(picks, names, names[i] === "其他" ? picks[i].hex : null);
}
strip.addEventListener("pointerover", pointAtChosen);
strip.addEventListener("focusin", pointAtChosen);
function restoreDesk() {
  if (!pinned && !trial) {
    el("hover-code").textContent = "";
    paintDesk(picks, names);
  }
}
strip.addEventListener("pointerleave", restoreDesk);
strip.addEventListener("focusout", restoreDesk);
function endTrial() {
  pinned = false;
  trial = null;
  el("compare").setAttribute("aria-pressed", "false");
  el("compare").textContent = "試放此色";
  trialProof();
}
el("compare").onclick = () => {
  if (pinned) return endTrial();
  pinned = true;
  el("compare").setAttribute("aria-pressed", "true");
  el("compare").textContent = "結束試放";
  trialProof(el("color-choice").value);
};
el("color-choice").onchange = () => {
  if (pinned) trialProof(el("color-choice").value);
};
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") endTrial();
});
const seams = seamControls(
  () => picks,
  (next) => {
    picks = next;
    syncRatios();
  },
  () => {
    updateLink();
    wheel?.update(options, picks, backgroundColor());
  },
);
function syncRatios() {
  [...el("allocations").querySelectorAll("input")].forEach(
    (field, i) => (field.value = picks[i].percent),
  );
  [...el("proportion").children].forEach((span, i) => {
    const p = picks[i];
    span.style.width = p.percent + "%";
    span.title = letter(i) + " " + p.hex + " " + p.percent + "%";
  });
  seams.sync();
  businessProof();
  endTrial();
  copyTicket++;
  el("mix-feedback").textContent = "比例已調整，合計 100%。";
}
function updateLink() {
  const url = new URL(location.href);
  url.searchParams.delete("palette");
  url.searchParams.delete("view");
  url.hash = "";
  mixParams(url);
  history.replaceState(null, "", url);
}
function choose(hex, origin) {
  const next = appendColor(picks, hex);
  if (next === picks) return;
  names[picks.length] = nextRole(picks, names);
  picks = next;
  page = 0;
  browseAll = false;
  updateLink();
  render();
  collectChip(hex, origin);
}
function refreshOutput() {
  const list = el("allocations"),
    bar = el("proportion");
  list.replaceChildren();
  bar.replaceChildren();
  for (const [i, pick] of picks.entries()) {
    const part = make("button");
    part.dataset.removeHex = pick.hex;
    part.setAttribute("aria-label", "移除 " + names[i] + " " + pick.hex);
    part.style.width = pick.percent + "%";
    part.style.background = pick.hex;
    part.title = letter(i) + " " + pick.hex + " " + pick.percent + "%";
    bar.append(part);
    const row = make("div");
    row.className = "allocation";
    const dot = make("button");
    dot.dataset.removeHex = pick.hex;
    dot.className = "remove-chip";
    dot.setAttribute("aria-label", "移除 " + names[i] + " " + pick.hex);
    dot.title = "移除 " + pick.hex;
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
      syncRatios();
      wheel?.update(options, picks, backgroundColor());
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
  for (const id of ["undo", "quick-copy", "copy-mix", "share-mix"])
    el(id).disabled = !picks.length;
  el("mix-empty").hidden = Boolean(picks.length);
  el("open-recipe").disabled = !picks.length;
  if (!picks.length) {
    el("recipe-sheet").hidden = true;
    el("open-recipe").setAttribute("aria-expanded", "false");
  }
}
function render() {
  el("desk-feedback").textContent = "";
  copyTicket++;
  const roleSet = names.slice(0, picks.length);
  const background = picks[roleSet.indexOf("背景")]?.hex;
  const whole = !roleSet.includes("主色") || browseAll;
  updateBackground(background);
  const full = picks.length === LIMIT;
  const upcoming = nextRole(picks, names);
  const primary =
    picks[names.slice(0, picks.length).indexOf("主色")]?.hex || picks[0]?.hex;
  const pool = full
    ? []
    : whole
      ? layer(
          Number(el("lightness").value),
          Number(el("saturation").value),
        ).filter((c) => !picks.some((p) => p.hex === c.hex))
      : candidates(picks, primary);
  if (!whole && !full && upcoming === "背景") {
    const neutrals = grays.filter(
      ([, hex]) => !picks.some((p) => p.hex === hex),
    );
    // 每批保留色相變化，第一批另提供能直接當頁底的淺、深中性色。
    const edges = [neutrals.at(-1), neutrals[1] || neutrals[0]].filter(Boolean);
    pool.unshift(...edges.map(([name, hex]) => ({ name, hex })));
    pool.length = Math.min(pool.length, 72);
  }
  if (!whole && !full) {
    const examples = referenceMatches(primary, upcoming, picks);
    for (const [i, color] of examples.entries()) {
      const duplicate = pool.findIndex((c) => c.hex === color.hex);
      if (duplicate >= 0) pool.splice(duplicate, 1);
      pool.splice(3 + i * 4, 0, color);
    }
    pool.length = Math.min(pool.length, 72);
  }
  const size = 12,
    pages = Math.ceil(pool.length / size);
  page = pages ? page % pages : 0;
  options = whole ? pool : pool.slice(page * size, (page + 1) * size);
  el("tones").hidden = !whole || full;
  el("more-colors").hidden = whole || full;
  el("more-colors").textContent = "換一組 " + (page + 1) + " / " + pages;
  el("switch-colors").hidden = !roleSet.includes("主色") || full;
  el("switch-colors").textContent = whole ? "回推薦配色" : "瀏覽全色環";
  el("brand-color").hidden = full;
  el("hex-feedback").textContent = "";
  hover(null);
  const ready = full || upcoming === "其他";
  el("pick-verb").textContent = ready ? "配色" : "選";
  el("hub-role").textContent = ready
    ? "就緒"
    : upcoming === "背景"
      ? "底色"
      : upcoming;
  el("instruction").textContent = full
    ? "已選八色，可以複製給 AI。"
    : ready
      ? "可直接複製給 AI，或再加一個點綴色。"
      : !roleSet.includes("主色")
        ? "從色環挑一個顏色。"
        : "滑過預覽，點一下加入。";
  el("wheel-kind").textContent = full
    ? "已選配色"
    : whole
      ? "色環"
      : "推薦搭配";
  el("wheel-kind").textContent +=
    "  /  " + (full ? picks.length : options.length) + " 色";
  const stepOrder = ["主色", "背景", "輔助色", "就緒"];
  const activeStep = ready ? "就緒" : upcoming;
  const activeIndex = Math.max(0, stepOrder.indexOf(activeStep));
  const fill = el("progress-bar-fill");
  if (fill) fill.style.width = (ready ? 100 : (activeIndex + 1) * 25) + "%";
  for (const li of el("progress-steps").children) {
    const idx = stepOrder.indexOf(li.dataset.step);
    li.classList.toggle("is-done", idx < activeIndex || (ready && idx === 3));
    li.classList.toggle("is-current", idx === activeIndex && !ready);
  }
  turnPage();
  el("choice-label").textContent = whole ? "色環選項" : "推薦配色";
  el("recommendations").replaceChildren();
  el("color-choice").replaceChildren();
  for (const choice of options) {
    const opt = make("option", choice.name + " " + choice.hex);
    opt.value = choice.hex;
    el("color-choice").append(opt);
  }
  const swatches =
    whole && !roleSet.includes("主色")
      ? [0, 1, 3, 6, 7, 9, 10, 12]
          .map((i) => ({ name: families[i].name, hex: families[i].colors[0] }))
          .filter((c) => !picks.some((p) => p.hex === c.hex))
      : whole
        ? options.filter((_, i) => i % Math.ceil(options.length / 8) === 0)
        : options;
  for (const choice of swatches) {
    const button = make("button");
    button.className = "rec";
    button.dataset.hex = choice.hex;
    button.style.setProperty(
      "--order",
      el("recommendations").childElementCount,
    );
    button.setAttribute("aria-label", "加入" + choice.name + " " + choice.hex);
    const chip = make("i");
    chip.style.background = choice.hex;
    button.append(chip, make("span", choice.name));
    button.title = choice.hex;
    bindPreview(
      button,
      () => hover(choice, true),
      () => hover(null),
    );
    button.onclick = () => {
      suppressHover = true;
      hover(null);
      choose(choice.hex, button.getBoundingClientRect());
    };
    el("recommendations").append(button);
  }
  el("color-choice").disabled = full;
  el("add-color").disabled = full;
  el("compare").disabled = full;
  el("add-color").textContent = roleSet.includes("主色")
    ? "加入搭配色"
    : "設為主色";
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
  seams.build();
  endTrial();
  rolePreview();
  chromaTrial = false;
  businessProof();
  if (picks.length && el("recipe-sheet").hidden) {
    setRecipe(true);
  }
}
function fallbackHit(e) {
  const rect = el("ring-fallback").getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width - 0.5,
    y = (e.clientY - rect.top) / rect.height - 0.5;
  const r = Math.hypot(x, y);
  if (r < 0.18 || r > 0.5) return null;
  const turn = (Math.atan2(x, -y) / (2 * Math.PI) + 1) % 1;
  if (options.length) return options[Math.floor(turn * options.length)];
  let end = 0;
  return picks.find((p) => turn * 100 < (end += p.percent));
}
const fallback = el("ring-fallback");
let fallbackHold;
function clearHold() {
  if (fallbackHold) clearTimeout(fallbackHold.timer);
  fallbackHold = null;
  hover(null);
}
fallback.onpointerdown = (e) => {
  const candidate = fallbackHit(e);
  if (!candidate || fallbackHold || e.button !== 0) return;
  fallback.setPointerCapture(e.pointerId);
  fallbackHold = {
    candidate,
    x: e.clientX,
    y: e.clientY,
    id: e.pointerId,
    borrow: false,
    timer: setTimeout(() => {
      fallbackHold.borrow = true;
      hover(candidate, true);
    }, 340),
  };
};
fallback.onpointermove = (e) => {
  if (
    fallbackHold &&
    Math.hypot(e.clientX - fallbackHold.x, e.clientY - fallbackHold.y) > 8
  )
    clearHold();
  if (!fallbackHold)
    hover(fallbackHit(e), e.pointerType !== "touch" && e.buttons === 0);
};
fallback.onpointerup = (e) => {
  if (fallbackHold?.id !== e.pointerId) return;
  const { borrow, candidate } = fallbackHold;
  clearHold();
  if (!borrow) {
    if (picks.some((p) => p.hex === candidate.hex))
      removeSelected(candidate.hex);
    else choose(candidate.hex);
  }
};
fallback.onpointercancel = fallback.onlostpointercapture = clearHold;
fallback.onpointerleave = () => {
  if (!fallbackHold) hover(null);
};
fallback.oncontextmenu = (e) => e.preventDefault();
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

  choose(hex);
};
function removeSelected(hex) {
  const i = picks.findIndex((p) => p.hex === hex);
  if (i < 0) return;
  picks = removeColor(picks, hex);
  names.splice(i, 1);
  names.push("其他");
  if (!picks.length) {
    names = [...defaults];
    source = null;
  }
  page = 0;
  browseAll = false;
  updateLink();
  render();
  const note = "已移除 " + hex + "。";
  el("desk-feedback").textContent = el("mix-feedback").textContent = note;
}
for (const id of [
  "proof-strip",
  "palette-values",
  "allocations",
  "proportion",
]) {
  el(id).addEventListener("click", (e) => {
    const swatch = e.target.closest("button[data-remove-hex]");
    if (!swatch) return;
    const index = [...el(id).querySelectorAll("[data-remove-hex]")].indexOf(
      swatch,
    );
    removeSelected(swatch.dataset.removeHex);
    if (e.detail === 0) {
      const buttons = el(id).querySelectorAll("[data-remove-hex]");
      (
        buttons[Math.min(index, buttons.length - 1)] ||
        (!el("recipe-sheet").hidden ? el("business-use") : el("open-recipe"))
      ).focus();
    }
  });
}
el("undo").onclick = () => removeSelected(picks.at(-1)?.hex);
let userCollapsedRecipe = false;
function setRecipe(open, manual = false) {
  if (manual) userCollapsedRecipe = !open;
  el("recipe-sheet").hidden = !open;
  el("open-recipe").setAttribute("aria-expanded", String(open));
  endTrial();
  if (open && manual) el("recipe-sheet").scrollIntoView({ block: "nearest" });
  else if (!open) {
    chromaTrial = false;
    if (location.hash === "#configuration") updateLink();
  }
}
el("open-recipe").onclick = () => setRecipe(el("recipe-sheet").hidden, true);
el("recipe-sheet").querySelector("[data-close]").onclick = () => {
  setRecipe(false, true);
  el("open-recipe").focus();
};
function syncTonePills() {
  for (const container of document.querySelectorAll(".tone-pills[data-sync]")) {
    const select = el(container.dataset.sync);
    if (!select) continue;
    if (!container.childElementCount) {
      for (const opt of select.options) {
        const btn = make("button", opt.textContent);
        btn.type = "button";
        btn.dataset.value = opt.value;
        btn.onclick = () => {
          select.value = opt.value;
          select.dispatchEvent(new Event("change"));
          syncTonePills();
        };
        container.append(btn);
      }
    }
    for (const btn of container.children) {
      btn.setAttribute("aria-pressed", String(btn.dataset.value === select.value));
    }
  }
}
syncTonePills();
el("custom-hex").addEventListener("input", () => {
  const raw = el("custom-hex").value.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{6}$/.test(raw)) {
    el("hex-dot").style.backgroundColor = "#" + raw;
  }
});
function resetDesk() {
  cancelFlight();
  showStudy(false);
  userCollapsedRecipe = false;
  setRecipe(false);
  el("custom-tools").open = false;
  picks = [];
  names = [...defaults];
  businessUse = el("business-use").value = "general";
  source = null;
  page = 0;
  browseAll = false;
  for (const id of ["gray-action", "lightness", "saturation"]) {
    const select = el(id);
    select.value =
      [...select.options].find((o) => o.defaultSelected)?.value ??
      select.options[0].value;
  }
  syncTonePills();
  el("advanced-output").open = false;
  el("hex-form").reset();
  el("hex-dot").style.backgroundColor = "#4659A8";
  el("bg-feedback").textContent = "";
  clearHold();

  wheel?.reset();
  updateLink();
  render();
  window.scrollTo({ top: 0, behavior: "instant" });
  el("desk-feedback").textContent = "已重設，請選主色。";
}
el("reset").onclick = resetDesk;
for (const button of document.querySelectorAll("[data-reset]"))
  button.onclick = resetDesk;
async function copy(text, success) {
  const ticket = ++copyTicket;
  try {
    await navigator.clipboard.writeText(text);
    if (ticket === copyTicket) {
      el("mix-feedback").textContent = success;
      el("desk-feedback").textContent = success;
    }
  } catch {
    window.prompt("請複製下方內容", text);
  }
}
el("quick-copy").onclick = el("copy-mix").onclick = () => {
  const lines = [
    format(picks, names),
    ...brief(picks, names, businessUse).lines,
  ];
  if (source) lines.push("色卡參考：" + huntUrl(source));
  copy(lines.join("\n"), "已複製整段配置表。");
};
el("share-mix").onclick = () => {
  const url = new URL(location.href);
  url.search = "";
  mixParams(url);
  url.hash = "mixer";
  copy(url.href, "已複製配色與比例連結。");
};
render();
if (location.hash === "#configuration" && picks.length) setRecipe(true);
const legacyId = initial.get("palette");
if (["#hunt", "#library", "#preview", "#sources"].includes(location.hash)) {
  const url = new URL(location.href);
  url.hash = "mixer";
  history.replaceState(null, "", url);
}
loadReferences().then((team) => {
  if (
    !legacyId ||
    picks.length ||
    new URL(location.href).searchParams.get("palette") !== legacyId
  )
    return;
  const palette = team.find((p) => p.id === legacyId);
  if (!palette) return;
  const c = palette.colors;
  picks = [c.primary, c.canvas, c.accent, c.text].reduce(appendColor, []);
  names = [...defaults];
  updateLink();
  render();
});
import("./ring.js")
  .then(({ createWheel }) => {
    const fallback = el("ring-fallback");
    wheel = createWheel(
      el("wheel-host"),
      choose,
      hover,
      () => {
        wheel = null;
        fallback.hidden = false;
      },
      removeSelected,
    );
    wheel.update(options, picks, backgroundColor());
    fallback.hidden = true;
  })
  .catch(() => {
    el("ring-fallback").hidden = false;
  });
