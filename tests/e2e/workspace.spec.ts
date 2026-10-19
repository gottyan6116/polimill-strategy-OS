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
  await page
    .getByLabel("メールアドレス", { exact: true })
    .fill(account().email);
  await page.getByLabel("パスワード", { exact: true }).fill("incorrect");
  await page.getByRole("button", { name: "ログイン", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("正しくありません");
  await page.getByLabel("パスワード", { exact: true }).fill(account().password);
  await page.getByRole("button", { name: "ログイン", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "経営ダッシュボード" }),
  ).toBeVisible();
  const snapshot = await page.request.get("/api/workspace");
  const data = await snapshot.json();
  const kpi = data.kpis[0];
  const payload = {
    kind: "kpis",
    id: kpi.id,
    version: kpi.version,
    name: kpi.name,
    actual: kpi.actual,
    target: 0,
    unit: kpi.unit,
    direction: kpi.direction,
  };
  expect(
    (
      await page.request.patch("/api/records", {
        data: payload,
        headers: { Origin: baseURL! },
      })
    ).status(),
  ).toBe(400);
  const otherOrg = { ...payload, id: "missing-other-org", target: 100 };
  expect(
    (
      await page.request.patch("/api/records", {
        data: otherOrg,
        headers: { Origin: baseURL! },
      })
    ).status(),
  ).toBe(409);
  await page.getByRole("button", { name: "事業開発部門", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "事業開発部門の目標" }),
  ).toBeVisible();
  await expect(
    page.getByText("自治体との共創を広げる", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "プロダクト部門", exact: true })
    .click();
  await page
    .getByRole("button", { name: `${kpi.name}を編集`, exact: true })
    .click();
  await page.getByLabel("現在値", { exact: true }).fill(String(kpi.actual + 1));
  await page.getByRole("button", { name: "変更を保存", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByRole("status")).toContainText("保存しました");
  await page.reload();
  await expect(page.locator(".kpi-number").first()).toContainText(
    (kpi.actual + 1).toLocaleString(),
  );
  expect(
    (
      await page.request.patch("/api/records", {
        data: { ...payload, target: kpi.target },
        headers: { Origin: baseURL! },
      })
    ).status(),
  ).toBe(409);
  const fresh = await (await page.request.get("/api/workspace")).json();
  const updated = fresh.kpis.find((k: { id: string }) => k.id === kpi.id);
  expect(
    (
      await page.request.patch("/api/records", {
        data: { ...payload, target: kpi.target, version: updated.version },
        headers: { Origin: baseURL! },
      })
    ).status(),
  ).toBe(200);
  await page.getByRole("button", { name: "目標を編集", exact: true }).click();
  await page
    .getByRole("textbox", { name: "仮説", exact: true })
    .fill(data.goals[0].hypothesis + " 検証中。");
  await page.getByRole("button", { name: "変更を保存", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.locator(".hypothesis-detail")).toContainText("検証中。");
  await page.getByRole("button", { name: "目標を編集", exact: true }).click();
  await page
    .getByRole("textbox", { name: "仮説", exact: true })
    .fill(data.goals[0].hypothesis);
  await page.getByRole("button", { name: "変更を保存", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  const initiative = data.initiatives.find(
    (i: { goal_id: string }) => i.goal_id === data.goals[0].id,
  );
  await page
    .getByRole("button", { name: `${initiative.title}を編集`, exact: true })
    .click();
  await page.getByLabel("進捗（%）").fill("77");
  await page.getByRole("button", { name: "変更を保存", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(
    page.getByRole("row").filter({ hasText: initiative.title }),
  ).toContainText("77%");
  await page
    .getByRole("button", { name: `${initiative.title}を編集`, exact: true })
    .click();
  await page.getByLabel("進捗（%）").fill(String(initiative.progress));
  await page.getByRole("button", { name: "変更を保存", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByLabel("組織・目標・KPI・施策を検索").fill("自治体");
  await page.locator(".search-results button").first().click();
  await expect(
    page.getByRole("heading", { name: "事業開発部門の目標" }),
  ).toBeVisible();
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
    page.getByRole("heading", { name: "経営ダッシュボード" }),
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
