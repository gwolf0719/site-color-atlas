import {
  LIMIT,
  roleNames,
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
let options = [],
  wheel = null,
  copyTicket = 0;
const make = (tag, text) => {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  return node;
};

function hover(candidate) {
  el("hover-code").textContent =
    candidate?.hex || (picks.length === LIMIT ? "100%" : "");
}
function updateLink() {
  const url = new URL(location.href);
  if (picks.length) url.searchParams.set("mix", encode(picks));
  else url.searchParams.delete("mix");
  history.replaceState(null, "", url);
}
function choose(hex) {
  const next = appendColor(picks, hex);
  if (next === picks) return;
  picks = next;
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
    const label = make("label", letter(i) + " " + roleNames[i]);
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
    input.setAttribute(
      "aria-label",
      letter(i) + " " + roleNames[i] + "面積百分比",
    );
    let startingWeights;
    input.onfocus = () => { startingWeights = picks; };
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
      wheel?.update(options, picks);
      copyTicket++;
      el("mix-feedback").textContent = "比例已調整，合計 100%。";
    };
    input.onblur = () => {
      input.value = picks[i].percent;
      startingWeights = null;
    };
    row.append(dot, label, input, make("span", "%"));
    list.append(row);
  }
  for (const id of ["undo", "reset", "copy-mix", "share-mix"])
    el(id).disabled = !picks.length;
  el("mix-empty").hidden = Boolean(picks.length);
}
function render() {
  copyTicket++;
  options = candidates(picks);
  hover(null);
  const full = picks.length === LIMIT;
  el("instruction").textContent = !picks.length
    ? "從色環點一個顏色當主色，再逐步加入適合的搭配。"
    : full
      ? "八個顏色已選齊。到下方調整面積比例，即可複製配置表。"
      : "點選色環或下方推薦色加入 " +
        letter(picks.length) +
        " 色。新增顏色會以較小面積加入。";
  el("hub-role").textContent = full
    ? "配置完成"
    : picks.length
      ? "選搭配色"
      : "選取主色";
  el("hub-letter").textContent = full ? "8" : letter(picks.length);
  el("choice-label").textContent = picks.length ? "推薦配色" : "色環選項";
  el("recommendations").replaceChildren();
  el("color-choice").replaceChildren();
  for (const choice of options) {
    const opt = make("option", choice.name + " " + choice.hex);
    opt.value = choice.hex;
    el("color-choice").append(opt);
    if (picks.length) {
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
  el("add-color").textContent = picks.length ? "加入搭配色" : "設為主色";
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
  wheel?.update(options, picks);
  el("mix-feedback").textContent = "";
  refreshOutput();
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
el("undo").onclick = () => {
  picks = removeLast(picks);
  updateLink();
  render();
};
el("reset").onclick = () => {
  picks = [];
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
el("copy-mix").onclick = () => copy(format(picks), "已複製整段配置表。");
el("share-mix").onclick = () => {
  const url = new URL(location.href);
  url.search = "";
  url.searchParams.set("mix", encode(picks));
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
    wheel.update(options, picks);
    fallback.hidden = true;
  })
  .catch(() => {
    el("ring-fallback").hidden = false;
  });
