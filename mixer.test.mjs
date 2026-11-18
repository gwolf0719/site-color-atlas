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
