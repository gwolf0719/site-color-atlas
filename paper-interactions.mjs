import { letter } from "./mixer-data.mjs";

export function transfer(picks, index, delta) {
  if (!picks[index + 1] || !picks[index] || !Number.isFinite(delta))
    return picks;
  const shift = Math.max(
    1 - picks[index].percent,
    Math.min(picks[index + 1].percent - 1, Math.round(delta)),
  );
  if (!shift) return picks;
  return picks.map((p, i) =>
    i === index || i === index + 1
      ? { ...p, percent: p.percent + (i === index ? shift : -shift) }
      : p,
  );
}

const el = (id) => document.getElementById(id);

export function drawProof(picks, sample = picks, caption = "", roles = []) {
  el("proof-state").textContent =
    caption ||
    (picks.length
      ? picks.length + " 色 · 點選可移除"
      : "選色後會顯示色碼與比例");
  const parts = sample.map((p) => {
    const selected = picks.some((pick) => pick.hex === p.hex);
    const part = document.createElement(selected ? "button" : "i");
    if (selected) {
      part.dataset.removeHex = p.hex;
      part.title = "移除 " + p.hex;
      part.setAttribute("aria-label", part.title);
    }
    part.style.width = p.percent + "%";
    part.style.backgroundColor = p.hex;
    return part;
  });
  el("proof-strip").replaceChildren(...parts);
  // 已選色碼保持在原位，滑過試色時只更新上方比例帶。
  if (sample !== picks) return;
  const values = el("palette-values");
  const key = picks
    .map((p, i) => [roles[i], p.hex, p.percent].join("/"))
    .join("|");
  if (values.dataset.key === key) return;
  values.dataset.key = key;
  values.replaceChildren(
    ...picks.map((p, i) => {
      const chip = document.createElement("button");
      chip.dataset.removeHex = p.hex;
      chip.setAttribute("aria-label", "移除" + roles[i] + " " + p.hex);
      chip.title = "移除" + roles[i] + " " + p.hex;
      const dot = document.createElement("i");
      dot.style.backgroundColor = p.hex;
      const code = document.createElement("code");
      code.textContent = p.hex;
      chip.append(dot, roles[i] + " ", code, " " + p.percent + "%");
      return chip;
    }),
  );
}

export function seamControls(getPicks, preview, commit) {
  const track = el("seams"),
    chooser = el("pair-choice");
  let drag;
  const change = (index, delta) => {
    preview(transfer(getPicks(), index, delta));
    commit();
  };
  function shift(e) {
    if (drag?.pointer !== e.pointerId) return;
    const dx =
      ((e.clientX - drag.x) * 100) / track.getBoundingClientRect().width;
    preview(transfer(drag.picks, drag.index, dx));
  }
  function finish(cancel) {
    if (!drag) return;
    const session = drag;
    drag = null;
    if (cancel) preview(session.picks);
    else commit();
    if (session.handle.hasPointerCapture(session.pointer))
      session.handle.releasePointerCapture(session.pointer);
  }
  function sync() {
    const picks = getPicks();
    let total = 0;
    for (const [i, handle] of [...track.children].entries()) {
      total += picks[i].percent;
      handle.style.left = total + "%";
      handle.setAttribute("aria-valuenow", picks[i].percent);
      handle.setAttribute(
        "aria-valuemax",
        picks[i].percent + picks[i + 1].percent - 1,
      );
      handle.setAttribute(
        "aria-valuetext",
        letter(i) +
          " " +
          picks[i].percent +
          "%，" +
          letter(i + 1) +
          " " +
          picks[i + 1].percent +
          "%",
      );
    }
    const i = chooser.selectedIndex;
    el("pair-minus").disabled = i < 0 || picks[i].percent <= 1;
    el("pair-plus").disabled = i < 0 || picks[i + 1].percent <= 1;
  }
  function build() {
    const selected = chooser.selectedIndex;
    drag = null;
    chooser.replaceChildren();
    track.replaceChildren();
    const picks = getPicks();
    el("pair-tools").hidden = picks.length < 2;
    picks.slice(1).forEach((_, i) => {
      const label = letter(i) + " ／ " + letter(i + 1);
      chooser.add(new Option(label, i));
      const handle = document.createElement("button");
      handle.setAttribute("role", "slider");
      handle.setAttribute("aria-valuemin", 1);
      handle.setAttribute("aria-label", label + " 交界，調整左色面積");
      handle.onpointerdown = (e) => {
        if (drag || e.button !== 0) return;
        chooser.selectedIndex = i;
        sync();
        drag = {
          pointer: e.pointerId,
          index: i,
          x: e.clientX,
          picks: getPicks(),
          handle,
        };
        handle.setPointerCapture(e.pointerId);
      };
      handle.onpointermove = shift;
      handle.onpointerup = (e) => {
        if (drag?.pointer === e.pointerId) {
          shift(e);
          finish(false);
        }
      };
      handle.onpointercancel = handle.onlostpointercapture = (e) => {
        if (drag?.pointer === e.pointerId) finish(true);
      };
      handle.onkeydown = (e) => {
        if (e.key === "Escape") return finish(true);
        if (!["ArrowLeft", "ArrowRight"].includes(e.key)) return;
        e.preventDefault();
        chooser.selectedIndex = i;
        change(i, e.key === "ArrowRight" ? 1 : -1);
      };
      track.append(handle);
    });
    chooser.selectedIndex = Math.min(Math.max(0, selected), chooser.length - 1);
    sync();
  }
  chooser.onchange = sync;
  el("pair-minus").onclick = () => change(chooser.selectedIndex, -1);
  el("pair-plus").onclick = () => change(chooser.selectedIndex, 1);
  window.addEventListener("blur", () => finish(true));
  return { build, sync };
}
