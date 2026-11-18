import { appendColor, LIMIT } from "./mixer-data.mjs";
import { defaults, ink } from "./color-rules.mjs";
import { contexts } from "./commercial-color.mjs";

export function nextRole(picks, names) {
  const used = names.slice(0, picks.length);
  return (
    defaults.find((role) => role !== "其他" && !used.includes(role)) || "其他"
  );
}

export function backgroundSample(picks, names, hex) {
  const roles = names.slice(0, picks.length);
  const bg = roles.indexOf("背景"),
    match = picks.findIndex((p) => p.hex === hex);
  if (bg >= 0) {
    const next = picks.map((p, i) => {
      if (i === bg) return { ...p, hex };
      if (i === match) return { ...p, hex: picks[bg].hex };
      return p;
    });
    return { picks: next, roles };
  }
  if (match >= 0) {
    roles[match] = "背景";
    return { picks, roles };
  }
  if (picks.length === LIMIT) return null;
  return { picks: appendColor(picks, hex), roles: [...roles, "背景"] };
}

export function sketch(box, picks, names, use, caption, role = "") {
  box.dataset.role = role;
  const roleColors = names.slice(0, picks.length);
  const value = (role, base) => picks[roleColors.indexOf(role)]?.hex || base;
  const bg = value("背景", "#ECECF1"),
    primary = value("主色", "#515366"),
    secondary = value("輔助色", "#D1D0DA");
  for (const [key, hex] of Object.entries({ bg, primary, secondary })) {
    box.style.setProperty("--mini-" + key, hex);
    box.style.setProperty("--on-" + key, ink(hex));
  }
  box.dataset.use = use;
  box.querySelector("small").textContent = caption;
  box.querySelector("strong").textContent = contexts[use].title;
  box.querySelector(".mini-tag").textContent = contexts[use].detail;
  box.querySelector(".mini-action").textContent = contexts[use].action;
  box.querySelector(".mini-marks").replaceChildren(
    ...picks
      .filter((p, i) => roleColors[i] === "其他")
      .map((p) => {
        const mark = document.createElement("i");
        mark.style.backgroundColor = p.hex;
        return mark;
      }),
  );
}

// 滑鼠立即試放，鍵盤焦點與觸控長按共用相同的資料路徑。
let activeButton;
export function bindPreview(button, onEnter, onLeave) {
  function begin() {
    activeButton = button;
    onEnter();
  }
  function end() {
    if (activeButton === button) {
      activeButton = null;
      onLeave();
    }
  }
  let timer = 0,
    held = false,
    start;
  function cancel() {
    clearTimeout(timer);
    start = null;
  }
  button.addEventListener("pointerenter", (e) => {
    if (e.pointerType !== "touch" && e.buttons === 0) begin();
  });
  button.addEventListener("pointerleave", () => {
    cancel();
    end();
  });
  button.addEventListener("focus", () => {
    if (button.matches(":focus-visible")) begin();
  });
  button.addEventListener("blur", end);
  button.addEventListener("pointerdown", (e) => {
    held = false;
    if (e.pointerType !== "touch") return;
    start = [e.clientX, e.clientY];
    timer = setTimeout(() => {
      held = true;
      begin();
    }, 340);
  });
  button.addEventListener("pointermove", (e) => {
    if (start && Math.hypot(e.clientX - start[0], e.clientY - start[1]) > 8) {
      cancel();
      end();
    }
  });
  button.addEventListener("pointerup", () => {
    cancel();
    if (held) end();
  });
  button.addEventListener("pointercancel", () => {
    cancel();
    end();
  });
  button.addEventListener(
    "click",
    (e) => {
      if (held) {
        held = false;
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    },
    true,
  );
}
