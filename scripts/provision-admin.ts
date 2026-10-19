import { mkdirSync, writeFileSync, unlinkSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { hashPassword } from "../lib/crypto";
const remote = process.argv.includes("--remote");
const email = (process.env.ADMIN_EMAIL ?? (!remote ? "admin@example.test" : ""))
  .trim()
  .toLowerCase();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  throw new Error("Set ADMIN_EMAIL to the initial administrator email.");
const password = randomBytes(24).toString("base64url");
const hash = await hashPassword(password);
const escape = (s: string) => `'${s.replaceAll("'", "''")}'`;
mkdirSync(".local", { recursive: true });
const sqlPath = ".local/provision.sql";
const mode = remote ? "remote" : "local";
// One-time creation only: existing users are never silently reset.
writeFileSync(
  sqlPath,
  `INSERT INTO users (id,organization_id,email,password_hash,name) VALUES (${escape(crypto.randomUUID())},'org-demo',${escape(email)},${escape(hash)},'MVP管理者');`,
);
try {
  const result = spawnSync(
    process.execPath,
    [
      "node_modules/wrangler/bin/wrangler.js",
      "d1",
      "execute",
      "polimill-strategy-os",
      remote ? "--remote" : "--local",
      "--file",
      sqlPath,
    ],
    { stdio: "pipe", encoding: "utf8" },
  );
  if (result.status !== 0)
    throw new Error(
      "Provisioning failed. Check authentication, migrations, and whether the account already exists. Existing passwords are not changed.",
    );
  writeFileSync(
    `.local/admin-${mode}.json`,
    JSON.stringify({ email, password }, null, 2),
    { mode: 0o600 },
  );
  console.log(
    `Administrator created. Credentials saved to ignored .local/admin-${mode}.json. Keep this file private.`,
  );
} finally {
  unlinkSync(sqlPath);
}
