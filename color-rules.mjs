import { hsl, ratio } from "./spectrum.mjs";

export const roles = ["背景", "主色", "輔助色", "其他"];
export const defaults = [
  "主色",
  "背景",
  "輔助色",
  "其他",
  "其他",
  "其他",
  "其他",
  "其他",
];
export const styles = { calm: "協調", bold: "鮮明高反差" };
export const hueGap = (a, b) => Math.abs(((a - b + 540) % 360) - 180);
export function ink(bg) {
  return ratio(bg, "#030305") > ratio(bg, "#FEFEFE") ? "#030305" : "#FEFEFE";
}
export function arrange(colors) {
  // 主色優先考慮彩度，背景取與主色明度差最大的候選。
  const primary = [...colors].sort((a, b) => hsl(b)[1] - hsl(a)[1])[0];
  const rest = colors.filter((c) => c !== primary);
  const bg = rest.reduce((a, b) =>
    ratio(primary, a) >= ratio(primary, b) ? a : b,
  );
  return [primary, bg, ...rest.filter((c) => c !== bg)];
}
export function cssRoles(picks, names) {
  const value = (role) => picks[names.indexOf(role)]?.hex;
  const primary = value("主色") || picks[0]?.hex || "#4659A8";
  const bg = value("背景") || "#E9EBF2";
  return {
    primary,
    bg,
    secondary: value("輔助色") || bg,
    accent: value("其他") || primary,
  };
}

export { ratio } from "./spectrum.mjs";
