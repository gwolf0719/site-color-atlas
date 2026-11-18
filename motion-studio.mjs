import { ink } from "./color-rules.mjs";
import { hsl } from "./spectrum.mjs";

const id = (name) => document.getElementById(name);
const plate = document.querySelector(".print-plate");
const study = id("color-study");
const toggle = id("study-toggle");
const reduce = matchMedia("(prefers-reduced-motion: reduce)");
let flight,
  currentHeading,
  lastSample = [[], [], null];

export function showStudy(open) {
  plate.toggleAttribute("data-study", open);
  toggle.setAttribute("aria-expanded", String(open));
  toggle.textContent = open ? "回到色環" : "並置比較";
  study.hidden = !open;
  proofColors(...lastSample);
}
toggle.onclick = () => showStudy(study.hidden);

export function proofColors(sample, roles, candidate) {
  lastSample = [sample, roles, candidate];
  const value = (role) => sample[roles.indexOf(role)]?.hex;
  const primary = value("主色");
  const focusColor = candidate || primary || sample[0]?.hex;
  const chip = primary || focusColor || "#AD254A";
  const left = value("背景") || "#DDDBE0";
  const secondary = value("輔助色");
  const right = secondary && secondary !== left ? secondary : ink(left);
  for (const [i, bg] of [left, right].entries()) {
    const field = study.querySelector(".study-fields").children[i];
    field.style.setProperty("--ground", bg);
    field.style.color = ink(bg);
    field.querySelector("code").textContent = bg;
  }
  study.style.setProperty("--sample", chip);
  id("study-ink").textContent = chip;
  const caption = id("readout-label"),
    code = id("readout-hex");
  if (!focusColor) {
    caption.textContent = study.hidden ? "拖曳旋轉 · 點選取色" : "示範主色";
    code.textContent = study.hidden ? "" : chip;
    return;
  }
  const [h, s, l] = hsl(focusColor);
  caption.textContent =
    (s ? "H " + Math.round(h) + "°" : "無彩色") +
    "  /  S " +
    Math.round(s * 100) +
    "%  /  L " +
    Math.round(l * 100) +
    "%";
  code.textContent = focusColor;
}
export function turnPage() {
  const heading = id("mix-title");
  const next = heading.textContent;
  if (next !== currentHeading && !reduce.matches) {
    heading.animate(
      [
        { clipPath: "inset(0 0 100% 0)", transform: "translateY(9px)" },
        { clipPath: "inset(0)", transform: "none" },
      ],
      { duration: 470, easing: "cubic-bezier(.2,.72,.2,1)" },
    );
  }
  currentHeading = next;
}
export function cancelFlight() {
  flight?.remove();
  flight = null;
}
export function collectChip(hex, origin) {
  cancelFlight();
  if (reduce.matches) return;
  const target = id("proof-strip").querySelector(
    '[data-remove-hex="' + hex + '"]',
  );
  if (!target) return;
  const box = target.getBoundingClientRect();
  const from = origin || id("orbit").getBoundingClientRect();
  const x = from.width === undefined ? from.x : from.left + from.width * 0.5;
  const y = from.height === undefined ? from.y : from.top + from.height * 0.5;
  const dx = box.left + box.width * 0.5 - x,
    dy = box.top + box.height * 0.5 - y;
  if (box.top >= innerHeight || box.bottom <= 0) return;
  const ticket = document.createElement("span");
  ticket.className = "travelling-chip";
  ticket.setAttribute("aria-hidden", "true");
  ticket.textContent = hex;
  Object.assign(ticket.style, {
    left: x + "px",
    top: y + "px",
    background: hex,
    color: ink(hex),
  });
  flight = ticket;
  document.body.append(ticket);
  const move = ticket.animate(
    [
      {
        transform: "translate(-50%,-50%) rotate(-10deg) scale(.72)",
        opacity: 0,
      },
      {
        offset: 0.16,
        transform: "translate(-50%,-75%) rotate(-7deg) scale(1)",
        opacity: 1,
      },
      {
        offset: 0.65,
        transform:
          "translate(calc(-50% + " +
          dx * 0.68 +
          "px),calc(-50% + " +
          (dy * 0.48 - 35) +
          "px)) rotate(5deg)",
        opacity: 1,
      },
      {
        transform:
          "translate(calc(-50% + " +
          dx +
          "px),calc(-50% + " +
          dy +
          "px)) scale(.45,.25)",
        opacity: 0,
      },
    ],
    { duration: 640, easing: "cubic-bezier(.25,.7,.32,1)" },
  );
  move.onfinish = () => ticket.remove();
}
reduce.addEventListener("change", () => {
  if (reduce.matches) cancelFlight();
});
