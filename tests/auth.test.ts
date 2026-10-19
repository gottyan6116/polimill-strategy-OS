import { test } from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword, digestToken } from "../lib/crypto.ts";
import { editSchema } from "../lib/validation.ts";
import { achievement } from "../lib/model.ts";
test("password hashes are salted, verifiable, and reject wrong passwords", async () => {
  const a = await hashPassword("local-only-test-password");
  const b = await hashPassword("local-only-test-password");
  assert.notEqual(a, b);
  assert.equal(await verifyPassword("local-only-test-password", a), true);
  assert.equal(await verifyPassword("incorrect", a), false);
  assert.equal(await verifyPassword("x", "broken"), false);
  assert.equal((await digestToken("opaque-session")).length, 64);
});
test("edits reject invalid values and unknown fields", () => {
  assert.equal(
    editSchema.safeParse({
      kind: "kpis",
      id: "k",
      version: 1,
      name: "参加者",
      actual: 10,
      target: 0,
      unit: "人",
      direction: "up",
    }).success,
    false,
  );
  assert.equal(
    editSchema.safeParse({
      kind: "initiatives",
      id: "i",
      version: 1,
      title: "施策",
      owner: "担当",
      progress: 101,
      status: "active",
      due_date: "2026-11-30",
    }).success,
    false,
  );
  assert.equal(
    editSchema.safeParse({
      kind: "goals",
      id: "g",
      version: 1,
      title: "目標",
      owner: "担当",
      hypothesis: "仮説",
      organization_id: "other",
    }).success,
    false,
  );
});
test("attainment respects lower-is-better and caps completion", () => {
  assert.equal(achievement({ actual: 50, target: 100, direction: "up" }), 50);
  assert.equal(achievement({ actual: 0, target: 10, direction: "down" }), 100);
  assert.equal(achievement({ actual: 20, target: 10, direction: "down" }), 50);
});
