import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
const account = () =>
  JSON.parse(readFileSync(".local/admin-local.json", "utf8")) as {
    email: string;
    password: string;
  };
test("authentication, drilldown, validated edits, persistence and logout", async ({
  page,
  request,
  baseURL,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  expect((await request.get("/api/workspace")).status()).toBe(401);
  const csrf = await request.post("/api/auth/login", {
    data: account(),
    headers: { Origin: "https://other.example" },
  });
  expect(csrf.status()).toBe(403);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login/);
  await page.getByLabel("メールアドレス", { exact: true }).fill(account().email);
  await page.getByLabel("パスワード", { exact: true }).fill("incorrect");
  await page.getByRole("button", { name: "ログイン", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("正しくありません");
  await page.getByLabel("パスワード", { exact: true }).fill(account().password);
  await page.getByRole("button", { name: "ログイン", exact: true }).click();
  await expect(page.getByRole("heading", { name: "経営サマリー", exact: true })).toBeVisible();
  const data = await (await page.request.get("/api/workspace")).json();
  const kpi = data.kpis[0];
  const goal = data.goals.find((g: { id: string }) => g.id === kpi.goal_id);
  const department = data.departments.find((d: { id: string }) => d.id === goal.department_id);
  const payload = {
    kind: "kpis", id: kpi.id, version: kpi.version, name: kpi.name,
    actual: kpi.actual, target: 0, unit: kpi.unit, direction: kpi.direction,
  };
  expect((await page.request.patch("/api/records", {
    data: payload, headers: { Origin: baseURL! },
  })).status()).toBe(400);
  expect((await page.request.patch("/api/records", {
    data: { ...payload, id: "missing-other-org", target: 100 },
    headers: { Origin: baseURL! },
  })).status()).toBe(409);

  const navigation = page.getByRole("navigation", { name: "メインナビゲーション" });
  await navigation.getByRole("button", { name: "KPI", exact: true }).click();
  await expect(page.getByRole("heading", { name: "KPI一覧", exact: true })).toBeVisible();
  await page.getByRole("button", { name: `${kpi.name}の詳細`, exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("対象月計画");
  await page.getByRole("button", { name: "KPIを編集", exact: true }).click();
  await page.getByLabel("現在値", { exact: true }).fill(String(kpi.actual + 1));
  await page.getByRole("button", { name: "変更を保存", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByRole("status")).toContainText("保存しました");
  await page.reload();
  await navigation.getByRole("button", { name: "KPI", exact: true }).click();
  await page.getByRole("button", { name: `${kpi.name}の詳細`, exact: true }).click();
  await page.getByRole("button", { name: "KPIを編集", exact: true }).click();
  await expect(page.getByLabel("現在値", { exact: true })).toHaveValue(String(kpi.actual + 1));
  await page.getByRole("button", { name: "キャンセル", exact: true }).click();
  expect((await page.request.patch("/api/records", {
    data: { ...payload, target: kpi.target }, headers: { Origin: baseURL! },
  })).status()).toBe(409);
  const fresh = await (await page.request.get("/api/workspace")).json();
  const updated = fresh.kpis.find((k: { id: string }) => k.id === kpi.id);
  expect((await page.request.patch("/api/records", {
    data: { ...payload, target: kpi.target, version: updated.version },
    headers: { Origin: baseURL! },
  })).status()).toBe(200);

  const openGoal = async () => {
    await navigation.getByRole("button", { name: "組織・部門目標", exact: true }).click();
    await page.getByRole("button", { name: `${department.name}の詳細`, exact: true }).click();
    const section = page.locator(".department-goal").filter({
      has: page.getByRole("heading", { name: goal.title, exact: true }),
    });
    await section.getByRole("button", { name: "目標を編集", exact: true }).click();
  };
  await openGoal();
  await page.getByRole("textbox", { name: "仮説", exact: true }).fill(goal.hypothesis + " 検証中。");
  await page.getByRole("button", { name: "変更を保存", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.reload();
  await openGoal();
  await expect(page.getByRole("textbox", { name: "仮説", exact: true })).toHaveValue(goal.hypothesis + " 検証中。");
  await page.getByRole("textbox", { name: "仮説", exact: true }).fill(goal.hypothesis);
  await page.getByRole("button", { name: "変更を保存", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();

  const initiative = data.initiatives[0];
  const openInitiative = async () => {
    await navigation.getByRole("button", { name: "実行施策", exact: true }).click();
    await page.getByRole("button", { name: `${initiative.title}の詳細`, exact: true }).click();
  };
  await openInitiative();
  await expect(page.getByRole("dialog")).toContainText("旧自己申告進捗");
  await page.getByRole("button", { name: "マイルストーンを追加", exact: true }).click();
  const milestoneForm = page.getByRole("form", { name: "マイルストーンを追加" });
  await expect(milestoneForm.getByLabel("完了日（未完了なら空欄）")).toHaveValue("");
  await milestoneForm.getByRole("button", { name: "キャンセル", exact: true }).click();
  await page.getByRole("button", { name: "施策を編集", exact: true }).click();
  await expect(page.getByLabel("進捗（%）", { exact: true })).toHaveCount(0);
  await page.getByLabel("担当", { exact: true }).fill(initiative.owner + " 検証中");
  await page.getByRole("button", { name: "変更を保存", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.reload();
  await openInitiative();
  await expect(page.getByRole("dialog")).toContainText(initiative.owner + " 検証中");
  await page.getByRole("button", { name: "施策を編集", exact: true }).click();
  await page.getByLabel("担当", { exact: true }).fill(initiative.owner);
  await page.getByRole("button", { name: "変更を保存", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  const restored = await (await page.request.get("/api/workspace")).json();
  expect(restored.kpis.find((k: { id: string }) => k.id === kpi.id).actual).toBe(kpi.actual);
  expect(restored.goals.find((g: { id: string }) => g.id === goal.id).hypothesis).toBe(goal.hypothesis);
  expect(restored.initiatives.find((i: { id: string }) => i.id === initiative.id).owner).toBe(initiative.owner);
  await page.getByLabel("組織・目標・KPI・施策を検索").fill(department.name);
  await page.locator(".search-results").getByRole("button", { name: department.name, exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("heading", { name: department.name, exact: true })).toBeVisible();
  await page.getByRole("dialog").getByRole("button", { name: "閉じる", exact: true }).click();
  await page.getByRole("button", { name: "ログアウト", exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
  expect((await page.request.get("/api/workspace")).status()).toBe(401);
  expect(errors).toEqual([]);
});
test("mobile login and layout do not overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await expect(
    page.getByRole("heading", { name: "アカウントにログイン" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .getByLabel("メールアドレス", { exact: true })
    .fill(account().email);
  await page.getByLabel("パスワード", { exact: true }).fill(account().password);
  await page.getByRole("button", { name: "ログイン", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "経営サマリー", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "メニューを切り替え" }).click();
  await page.getByRole("button", { name: "ログアウト", exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
});
test("legitimate logins sharing an IP do not hit the account failure limit", async ({
  request,
  baseURL,
}) => {
  for (let i = 0; i < 11; i++)
    expect(
      (
        await request.post("/api/auth/login", {
          data: account(),
          headers: { Origin: baseURL! },
        })
      ).status(),
    ).toBe(200);
});
test("repeated failed logins are throttled", async ({ request, baseURL }) => {
  let status = 0;
  for (let i = 0; i < 11; i++) {
    const result = await request.post("/api/auth/login", {
      data: { email: "nonexistent@example.test", password: "invalid" },
      headers: { Origin: baseURL! },
    });
    status = result.status();
  }
  expect(status).toBe(429);
});
test("login form never exposes credentials through a GET navigation without JavaScript", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(baseURL! + "/login");
  await expect(page.locator("form")).toHaveAttribute("method", "post");
  await expect(
    page.getByRole("button", { name: "ログイン", exact: true }),
  ).toBeDisabled();
  expect(page.url()).not.toContain("password");
  await context.close();
});
