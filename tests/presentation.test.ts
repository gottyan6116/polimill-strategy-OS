import { test } from "node:test";
import assert from "node:assert/strict";
import { money, preciseMoney, percent, count } from "../components/finance/format.ts";
import { niceAxis, profitBar } from "../lib/presentation.ts";
test("financial formatting preserves zero and missing values with presentation precision", () => {
  assert.equal(money(38.080003), "38"); assert.equal(preciseMoney(38.080003), "38");
  assert.equal(money(null), "—"); assert.equal(money(0), "0");
  assert.equal(money(-0.1),"0");
  assert.equal(percent(12), "12.0%"); assert.equal(count(12), "12");
});
test("nice axes cover signed, zero, missing and large ranges with a zero tick", () => {
  for (const values of [[-3, 8], [0], [null], [123456789, -9876543], [0.00001, 0.00003]]) {
    const a = niceAxis(values); assert.ok(a.max > a.min); assert.ok(a.step > 0);
    assert.ok(a.ticks.includes(0));
    for (const v of values) if (v !== null) assert.ok(v >= a.min && v <= a.max);
    const scaled=a.step/10**Math.floor(Math.log10(a.step)); assert.ok([1,2,2.5,5,10].some(v=>Math.abs(v-scaled)<1e-9));
  }
});
test("positive NOPAT uses full width while signed NOPAT reserves both sides", () => {
  assert.deepEqual(profitBar(10,[5,10]),{width:100,marginLeft:0});
  assert.deepEqual(profitBar(-10,[-10,10]),{width:50,marginLeft:0});
  assert.deepEqual(profitBar(10,[-10,10]),{width:50,marginLeft:50});
});
test("small positive NOPAT still uses full plotting width",()=>assert.deepEqual(profitBar(.5,[.2,.5]),{width:100,marginLeft:0}));
