import test from "node:test";
import assert from "node:assert/strict";
import {
  families,
  candidates,
  appendColor,
  adjust,
  removeLast,
  encode,
  decode,
  format,
  LIMIT,
} from "./mixer-data.mjs";
test("所有主色均可連續推薦，每次的比例與分享資料可還原", () => {
  for (const f of families) {
    let picks = appendColor([], f.colors[0]);
    for (let i = 1; i < LIMIT; i++) {
      const next = candidates(picks);
      assert.ok(next.length);
      const old = picks;
      picks = appendColor(old, next[i % next.length].hex);
      assert.equal(new Set(picks.map((p) => p.hex)).size, i + 1);
      assert.equal(
        picks.reduce((s, p) => s + p.percent, 0),
        100,
      );
      assert.ok(picks.at(-1).percent <= picks.at(-2).percent);
      assert.deepEqual(decode(encode(picks)), picks);
    }
    assert.equal(candidates(picks).length, 0);
    for (const percent of [1, 17, 63, 100]) {
      const revised = adjust(picks, 1, percent);
      assert.equal(
        revised.reduce((s, p) => s + p.percent, 0),
        100,
      );
      assert.ok(revised.every((p) => p.percent >= 1));
      assert.deepEqual(decode(encode(revised)), revised);
      assert.match(
        format(revised),
        new RegExp(revised[1].hex + "　" + revised[1].percent + "%"),
      );
    }
    assert.equal(
      removeLast(picks).reduce((s, p) => s + p.percent, 0),
      100,
    );
  }
});
test("拒絕無效網址及重複選色", () => {
  for (const input of [
    "not-a-color",
    "FFFFFF-100",
    "AD254A-2",
    "AD254A-50.AD254A-50",
  ]) {
    assert.deepEqual(decode(input), []);
  }
  const first = appendColor([], "#AD254A");
  assert.deepEqual(appendColor(first, "#AD254A"), first);
});

import { spectrum, layer, harmonies, safe } from "./spectrum.mjs";
test("全色階可選，推薦六批不重複，自訂與舊連結能還原", () => {
  assert.equal(spectrum.length, 1095);
  assert.equal(new Set(spectrum.map((c) => c.hex)).size, spectrum.length);
  assert.equal(layer(40, 44).length, 48);
  for (const c of spectrum)
    assert.deepEqual(decode(encode(appendColor([], c.hex))), [
      { hex: c.hex, percent: 100 },
    ]);
  const old = "AD254A-61.9BAED4-24.92A64A-15";
  assert.equal(encode(decode(old)), old);
  const custom = appendColor([], "#403B91");
  assert.equal(custom.length, 1);
  const options = harmonies(custom);
  assert.equal(new Set(options.map((o) => o.hex)).size, 72);
  assert.ok(options.every((o) => safe(o.hex) && o.hex !== custom[0].hex));
  for (const forbidden of [
    "#FFFFFF",
    "#F4F5F7",
    "#FDF4DF",
    "#CCF4DC",
    "#00FF11",
  ])
    assert.equal(safe(forbidden), false);
});

import { readFileSync } from "node:fs";
import { ratio } from "./spectrum.mjs";
import { arrange } from "./color-rules.mjs";
test("Color Hunt 快照完整、可套用的原卡與角色可往返", () => {
  const src = JSON.parse(
    readFileSync(new URL("./colorhunt.json", import.meta.url)),
  );
  assert.equal(src.terminalPageSize, 0);
  assert.equal(new Set(src.codes).size, 4303);
  assert.ok(src.codes.every((c) => /^[0-9A-F]{24}$/.test(c)));
  const rows = src.codes.map((c) => c.match(/.{6}/g).map((v) => "#" + v));
  assert.equal(new Set(rows.flat()).size, 14489);
  const eligible = rows.filter((r) => r.every(safe));
  assert.equal(eligible.length, 989);
  for (const r of eligible) {
    const picks = arrange(r).reduce(appendColor, []);
    assert.equal(picks.length, 4);
    assert.deepEqual(decode(encode(picks)), picks);
  }
});
test("選主色後直接在同一批推薦鄰近色與互補色，排除已選色", () => {
  for (const hex of ["#933939", "#777777", "#131319"]) {
    const chosen = appendColor(appendColor([], "#FEFEFE"), hex);
    const list = candidates(chosen, hex);
    assert.equal(list.length, 72);
    assert.ok(list.every((c) => !chosen.some((p) => p.hex === c.hex)));
    const first = list.slice(0, 12);
    assert.ok(first.some((c) => c.name.startsWith("鄰近色")));
    assert.ok(first.some((c) => c.name.startsWith("互補")));
  }
});

import { transfer } from "./paper-interactions.mjs";
test("移動交界只交換相鄰面積，保留來源與總量", () => {
  const original = [
    { hex: "#000000", percent: 65 },
    { hex: "#707070", percent: 30 },
    { hex: "#FEFEFE", percent: 5 },
  ];
  for (const [delta, expected] of [
    [9, [74, 21, 5]],
    [-200, [1, 94, 5]],
    [120, [94, 1, 5]],
  ]) {
    assert.deepEqual(
      transfer(original, 0, delta).map((p) => p.percent),
      expected,
    );
  }
  assert.deepEqual(
    original.map((p) => p.percent),
    [65, 30, 5],
  );
});

import { brief, quieterPrimary } from "./commercial-color.mjs";
test("不同用途採用正式比例與可讀字色，彩度試放可獨立捨棄", () => {
  const picks = [
    { hex: "#4659A8", percent: 35 },
    { hex: "#434854", percent: 65 },
  ];
  const names = ["主色", "背景"],
    original = encode(picks);
  const alternative = quieterPrimary(picks, names);
  assert.ok(alternative && alternative !== picks[0].hex);
  for (const context of ["brand", "shop", "system", "unknown"]) {
    const actual = brief(picks, names, context),
      trial = brief(picks, names, context, alternative);
    assert.ok(
      ratio(actual.bg, actual.body) >= 4.5 &&
        ratio(actual.accent, actual.onAccent) >= 4.5,
    );
    assert.ok(ratio(actual.edge, actual.bg) >= 3);
    assert.equal(trial.accent, alternative);
    assert.ok(actual.lines.join("").includes("35%"));
  }
  assert.equal(encode(picks), original);
  assert.equal(
    quieterPrimary([{ hex: "#808080", percent: 100 }], ["主色"]),
    null,
  );
  assert.equal(brief(picks.slice(0, 1), ["主色"], "shop").bg, undefined);
});

import { removeColor } from "./mixer-data.mjs";
test("移除任意已選色後保持次序與相對面積，零色及單色可安全處理", () => {
  const picks = decode("4659A8-70.000000-20.FEFEFE-10");
  assert.deepEqual(removeColor(picks, "#000000"), [
    { hex: "#4659A8", percent: 88 },
    { hex: "#FEFEFE", percent: 12 },
  ]);
  const one = removeColor(removeColor(picks, "#4659A8"), "#FEFEFE");
  assert.deepEqual(one, [{ hex: "#000000", percent: 100 }]);
  assert.deepEqual(removeColor(one, "#000000"), []);
  assert.equal(removeColor(picks, "#ababab"), picks);
  assert.equal(picks.length, 3);
});

import { backgroundSample, nextRole } from "./live-proof.mjs";
test("移入預覽依缺少的角色試放，替換背景維持百分比且保留正式配色", () => {
  const picks = decode("4659A8-60.000000-30.FEFEFE-10");
  const names = ["主色", "背景", "輔助色"];
  const original = encode(picks);
  const sample = backgroundSample(picks, names, "#FEFEFE");
  assert.deepEqual(
    sample.picks.map((p) => p.hex),
    ["#4659A8", "#FEFEFE", "#000000"],
  );
  assert.deepEqual(
    sample.picks.map((p) => p.percent),
    [60, 30, 10],
  );
  assert.equal(encode(picks), original);
  assert.equal(nextRole([], []), "主色");
  assert.equal(nextRole(picks.slice(0, 1), ["主色"]), "背景");
  assert.equal(nextRole(picks.slice(0, 2), names), "輔助色");
  assert.equal(nextRole(picks, names), "其他");
  assert.deepEqual(backgroundSample([], [], "#000000").roles, ["背景"]);
});
