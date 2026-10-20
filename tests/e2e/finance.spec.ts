import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import type {
  FinanceRecord,
  FinanceFields,
  FinanceWorkspace,
} from "../../lib/finance";
const credentials = () =>
  JSON.parse(readFileSync(".local/admin-local.json", "utf8")) as {
    email: string;
    password: string;
  };
const fields = (r: FinanceRecord): FinanceFields => {
  const { id, business_unit_id, fiscal_year, version, ...rest } = r;
  return Object.fromEntries(
    Object.keys(rest)
      .filter((k) => k !== "updated_at")
      .map((k) => [k, rest[k as keyof typeof rest]]),
  ) as FinanceFields;
};
test("four financial views, scoped validation, historical carry-forward and persistence", async ({
  page,
  request,
  baseURL,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  expect((await request.get("/api/finance")).status()).toBe(401);
  expect(
    (
      await request.patch("/api/finance", {
        data: {},
        headers: { Origin: baseURL! },
      })
    ).status(),
  ).toBe(401);
  await page.goto("/login");
  await page
    .getByLabel("メールアドレス", { exact: true })
    .fill(credentials().email);
  await page
    .getByLabel("パスワード", { exact: true })
    .fill(credentials().password);
  await page.getByRole("button", { name: "ログイン", exact: true }).click();
  await page.getByRole("button", { name: "財務分析", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "事業ポートフォリオ", exact: true }),
  ).toBeVisible();
  const original = (await (
    await page.request.get("/api/finance")
  ).json()) as FinanceWorkspace;
  expect(original.units).toHaveLength(3);
  expect(original.records).toHaveLength(9);
  const first = original.records.find(
    (r) =>
      r.business_unit_id === original.units[0].id && r.fiscal_year === 2024,
  )!;
  const patch = (
    id: string,
    version: number,
    value: FinanceFields,
    origin = baseURL!,
  ) =>
    page.request.patch("/api/finance", {
      data: { id, version, fields: value },
      headers: { Origin: origin },
    });
  expect(
    (
      await patch(
        first.id,
        first.version,
        fields(first),
        "https://other.example",
      )
    ).status(),
  ).toBe(403);
  expect((await patch("other-org-record", 1, fields(first))).status()).toBe(
    409,
  );
  expect(
    (
      await patch(first.id, first.version, { ...fields(first), tax_rate: 2 })
    ).status(),
  ).toBe(400);
  expect(
    (
      await patch(first.id, first.version, {
        ...fields(first),
        operating_cf: first.operating_cf + 1,
      })
    ).status(),
  ).toBe(200);
  const changed = (await (
    await page.request.get("/api/finance")
  ).json()) as FinanceWorkspace;
  for (const year of [2025, 2026]) {
    const before = original.records.find(
      (r) =>
        r.business_unit_id === first.business_unit_id && r.fiscal_year === year,
    )!;
    const after = changed.records.find((r) => r.id === before.id)!;
    expect(after.opening_cash).toBe(before.opening_cash + 1);
    expect(after.opening_assets).toBe(before.opening_assets + 1);
    expect(after.version).toBe(before.version + 1);
  }
  expect((await patch(first.id, first.version, fields(first))).status()).toBe(
    409,
  );
  const latest = changed.records.find((r) => r.id === first.id)!;
  expect((await patch(first.id, latest.version, fields(first))).status()).toBe(
    200,
  );
  await page
    .getByRole("button", { name: "財務データを再読み込み", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "市民参画SaaS（仮）のROICを見る",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("tab", { name: "ROICツリー", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByRole("heading", { name: "投下資本の内訳", exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "財務指標", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "収益性", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "安全性", exact: true }),
  ).toBeVisible();
  await page.getByLabel("財務分析の年度").selectOption("2024");
  await expect(page.locator(".finance-content")).toContainText("—");
  await page.getByLabel("財務分析の年度").selectOption("2026");
  await page
    .getByRole("tab", { name: "キャッシュフロー", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "現預金の増減", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "キャッシュフロー明細", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "市民参画SaaS（仮）の財務データを編集",
      exact: true,
    })
    .click();
  await expect(page.getByLabel("期首現預金", { exact: true })).toHaveAttribute(
    "readonly",
    "",
  );
  const current = original.records.find(
    (r) =>
      r.business_unit_id === first.business_unit_id && r.fiscal_year === 2026,
  )!;
  await page
    .getByLabel("売上高", { exact: true })
    .fill(String(current.revenue + 1));
  await page
    .getByRole("button", { name: "財務データを保存", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByRole("status")).toContainText("財務データを保存");
  await page.reload();
  await page.getByRole("button", { name: "財務分析", exact: true }).click();
  await page.getByLabel("財務分析の事業").selectOption(first.business_unit_id);
  await expect(page.locator(".finance-metrics")).toContainText(
    (current.revenue + 1).toLocaleString("ja-JP", {maximumFractionDigits:0}),
  );
  const finalData = (await (
    await page.request.get("/api/finance")
  ).json()) as FinanceWorkspace;
  expect(
    (
      await patch(
        current.id,
        finalData.records.find((r) => r.id === current.id)!.version,
        fields(current),
      )
    ).status(),
  ).toBe(200);
  expect(errors).toEqual([]);
  await page.getByRole("button", { name: "ログアウト", exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
});
test("financial views fit mobile with internally scrollable charts and tables", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/login");
  await page
    .getByLabel("メールアドレス", { exact: true })
    .fill(credentials().email);
  await page
    .getByLabel("パスワード", { exact: true })
    .fill(credentials().password);
  await page.getByRole("button", { name: "ログイン", exact: true }).click();
  await page.getByRole("button", { name: "メニューを切り替え" }).click();
  await page.getByRole("button", { name: "財務分析", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "事業ポートフォリオ", exact: true }),
  ).toBeVisible();
  for (const name of [
    "ポートフォリオ",
    "ROICツリー",
    "財務指標",
    "キャッシュフロー",
  ]) {
    await page.getByRole("tab", { name, exact: true }).click();
    await expect(page.getByRole("tabpanel")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});
