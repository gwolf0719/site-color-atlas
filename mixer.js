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
import { setupCatalog } from "./app.js";
import { drawProof, seamControls } from "./paper-interactions.mjs";
import {
  roles,
  defaults,
  styles,
  cssRoles,
  ink,
  ratio,
} from "./color-rules.mjs";
import { huntUrl } from "./hunt.js";
import { layer, safe } from "./spectrum.mjs";
import {
  LIMIT,
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
    : "brand";
let chromaTrial = false;
el("business-use").value = businessUse;
function businessProof() {
  const variant = renderCommercial(picks, names, businessUse, chromaTrial);
  if (el("recipe-sheet").open) {
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
  if (businessUse !== "brand") url.searchParams.set("use", businessUse);
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
          : "主色適合大色塊，內文請另選對比足夠的字色。")
      : "指定主色與背景後，這裡會顯示兩色的文字對比。";
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
    el("custom-bg").value = backgroundColor() || "#D9DCE5";
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
  if (!hex) el("custom-bg").value = "#D9DCE5";
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
  drawProof(picks, sample, caption);
  const stage = el("wheel-host").parentElement;
  const bg = sample[sampleRoles.indexOf("背景")]?.hex;
  const tryBg = !!bg && bg !== backgroundColor();
  stage.toggleAttribute("data-trial-bg", tryBg);
  if (tryBg) {
    stage.style.setProperty("--trial-base", bg);
    stage.style.setProperty("--trial-ink", ink(bg));
  }
  wheel?.setBackdrop(bg);
  paintDesk(sample, sampleRoles, role === "其他" ? hex : null);
}
function hover(candidate, show = false, action = "add") {
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
function choose(hex) {
  const next = appendColor(picks, hex);
  if (next === picks) return;
  names[picks.length] = nextRole(picks, names);
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
  el("find-hunt").hidden = !names.slice(0, picks.length).includes("主色");
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
  el("instruction").textContent = full
    ? "八色已齊。移動色紙交界，調整最後的比例。"
    : "滑鼠移入或長按試色，點選加入" + upcoming + "。橫拖可轉動色盤。";
  el("hub-role").textContent = full
    ? "配置完成"
    : picks.length
      ? upcoming
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
      bindPreview(
        button,
        () => hover(choice, true),
        () => hover(null),
      );
      button.onclick = () => choose(choice.hex);
      el("recommendations").append(button);
    }
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
  el("brand-color").open = false;
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
for (const id of ["proof-strip", "allocations", "proportion"]) {
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
        (el("recipe-sheet").open ? el("business-use") : el("open-recipe"))
      ).focus();
    }
  });
}
el("undo").onclick = () => removeSelected(picks.at(-1)?.hex);
const catalog = setupCatalog(
  (colors, code = null) => {
    el("catalog-sheet").close();
    picks = colors.reduce(appendColor, []);
    names = [...defaults];
    source = code;
    page = 0;
    browseAll = false;
    updateLink();
    render();
    window.scrollTo({ top: 0, behavior: "instant" });
    el("desk-feedback").textContent = "已套用 " + picks.length + " 色。";
  },
  () => [picks[names.slice(0, picks.length).indexOf("主色")]?.hex || "", style],
  (colors) => {
    trial = null;
    trialProof(null, "add", colors);
  },
);

el("open-library").onclick = el("find-hunt").onclick = () => catalog.open();
el("open-recipe").onclick = () => {
  endTrial();
  el("recipe-sheet").showModal();
};
for (const button of document.querySelectorAll("[data-close]"))
  button.onclick = () => button.closest("dialog").close();
function resetDesk() {
  for (const dialog of document.querySelectorAll("dialog[open]"))
    dialog.close();
  picks = [];
  names = [...defaults];
  style = "calm";
  businessUse = el("business-use").value = "brand";
  source = null;
  page = 0;
  browseAll = false;
  for (const id of ["gray-action", "lightness", "saturation"]) {
    const select = el(id);
    select.value =
      [...select.options].find((o) => o.defaultSelected)?.value ??
      select.options[0].value;
  }
  el("precision").open = el("brand-color").open = false;
  el("hex-form").reset();
  el("bg-feedback").textContent = "";
  clearHold();
  catalog.reset();
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
  const lines = [format(picks, names), "配色方向：" + styles[style]];
  lines.push(...brief(picks, names, businessUse).lines);
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
el("recipe-sheet").addEventListener("close", () => {
  chromaTrial = false;
  businessProof();
  endTrial();
});
const panel = location.hash.slice(1);
if (["hunt", "library", "preview", "sources"].includes(panel))
  catalog.open(panel);
else if (initial.has("palette")) catalog.open("preview");
else if (panel === "configuration") el("recipe-sheet").showModal();
for (const dialog of document.querySelectorAll("dialog"))
  dialog.addEventListener("close", () => {
    const url = new URL(location.href);
    if (
      ["#hunt", "#preview", "#library", "#sources", "#configuration"].includes(
        url.hash,
      )
    )
      url.hash = "";
    url.searchParams.delete("palette");
    url.searchParams.delete("view");
    history.replaceState(null, "", url);
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
