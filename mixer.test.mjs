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
import { arrange, defaults } from "./color-rules.mjs";
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
test("協調與高反差產生不同推薦，後者符合主色對比門檻", () => {
  for (const hex of ["#933939", "#9BAED4", "#131319", "#AD254A", "#777777"]) {
    const p = appendColor([], hex),
      a = candidates(p, "calm"),
      b = candidates(p, "bold");
    assert.equal(a.length, 72);
    assert.equal(b.length, 72);
    assert.notDeepEqual(a, b);
    assert.ok(b.every((c) => ratio(hex, c.hex) >= 3));
  }
  assert.deepEqual(defaults.slice(0, 4), ["主色", "背景", "輔助色", "其他"]);
});

test("高反差候選未滿一整批時可正常呈現", () => {
  const result = candidates(
    decode("CB2957-20.EEEEEE-16.000000-9.DDDDDD-55"),
    "bold",
  );
  assert.ok(result.length > 0 && result.length < 72);
  assert.ok(result.every((c) => ratio(c.hex, "#CB2957") >= 3));
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
