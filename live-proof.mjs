import { appendColor, LIMIT } from "./mixer-data.mjs";
import { defaults, ink } from "./color-rules.mjs";
import { ratio } from "./spectrum.mjs";

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

// 暫放與已選配色使用同一組 CSS 變數；編輯器的結構與文案保持固定。
export function paintDesk(picks, names, accentOverride) {
  const root = document.documentElement;
  const assigned = names.slice(0, picks.length);
  const value = (role) => picks[assigned.indexOf(role)]?.hex;
  const bg = value("背景"),
    primary = value("主色"),
    secondary = value("輔助色");
  const accents = picks
    .filter((p, i) => assigned[i] === "其他")
    .map((p) => p.hex);
  const accent = accentOverride || accents.at(-1);
  for (const [key, hex] of Object.entries({ bg, primary, secondary, accent })) {
    root.toggleAttribute("data-color-" + key, Boolean(hex));
    if (hex) {
      root.style.setProperty("--desk-" + key, hex);
      root.style.setProperty("--on-desk-" + key, ink(hex));
    } else {
      root.style.removeProperty("--desk-" + key);
      root.style.removeProperty("--on-desk-" + key);
    }
  }
  // 大標題可讀時直接上色；明度接近時，用同色下劃線呈現選色。
  const surface = bg || "#D9DCE5";
  root.toggleAttribute(
    "data-ink-primary",
    Boolean(primary && ratio(primary, surface) >= 3),
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
