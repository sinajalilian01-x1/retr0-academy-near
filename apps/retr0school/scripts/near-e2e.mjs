// Headless end-to-end check of the live judge flows. No secrets and no wallet needed.
// Run from apps/retr0school:  npx playwright install chromium && npm run test:e2e
// Against a local server:     R0_URL=http://127.0.0.1:3000 npm run test:e2e
// Screenshots go to $OUT (default: ../../artifacts/e2e/).
import fs from "node:fs";
import { chromium, devices } from "playwright";

const R0 = (process.env.R0_URL || "https://retr0school-near.vercel.app").replace(/\/+$/, "");
const CE = (process.env.CE_URL || "https://code-e-near.vercel.app").replace(/\/+$/, "");
const OUT = process.env.OUT || new URL("../../../artifacts/e2e/", import.meta.url).pathname;
const HOLDER = process.env.HOLDER_ACCOUNT || "exam-tester.retr0school.testnet";
fs.mkdirSync(OUT, { recursive: true });

const results = [];
const ok = (name, pass, detail = "") => {
  results.push({ name, pass });
  console.log(`${pass ? "PASS" : "FAIL"} ${name}${detail ? ` · ${detail}` : ""}`);
};
const step = async (name, fn) => {
  try {
    await fn();
  } catch (e) {
    ok(name, false, String(e).split("\n")[0]);
  }
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1366, height: 860 }, colorScheme: "dark" });
const page = await ctx.newPage();
const consoleErrors = [];
page.on("pageerror", (e) => consoleErrors.push(e.message));

await step("home", async () => {
  await page.goto(R0, { waitUntil: "networkidle" });
  ok("home: hero title", await page.getByRole("heading", { name: "Learn Web3 with Retr0 Academy" }).isVisible());
  ok("home: NEAR Developer path listed first", await page.getByText("NEAR Developer path", { exact: false }).first().isVisible());
  ok("home: final exam card", await page.getByTestId("track-card-exam").isVisible());
  await page.screenshot({ path: OUT + "home.png" });
});

await step("lesson", async () => {
  await page.goto(R0 + "/fundamentals/transactions-and-gas", { waitUntil: "networkidle" });
  ok("lesson: animated diagram present", (await page.getByTestId("lesson-anim").count()) > 0);
  ok("lesson: no leftover Ethereum gas units", !(await page.locator("main").innerText()).includes("gwei"));
});

await step("playground → Code E", async () => {
  await page.goto(R0 + "/dapp/view-vs-change-calls", { waitUntil: "networkidle" });
  const href = await page.getByTestId("open-in-playground").first().getAttribute("href");
  ok("lesson: Open in Playground link", Boolean(href?.includes("/playground")));
  await page.goto(new URL(href, R0).href, { waitUntil: "networkidle" });
  const ceHref = await page.getByTestId("open-in-code-e").first().getAttribute("href");
  ok("playground: Open in Code E link", Boolean(ceHref?.startsWith(CE + "/#code=")));
  const ce = await ctx.newPage();
  await ce.goto(ceHref, { waitUntil: "networkidle" });
  const frame = ce.frameLocator("#preview");
  await frame.locator("#go").click();
  await frame.locator("#out").filter({ hasText: "valid" }).waitFor({ timeout: 20000 });
  ok("Code E: lesson example reads verify_diploma from testnet", (await frame.locator("#out").innerText()).includes('"valid": true'));
  await ce.screenshot({ path: OUT + "code-e.png" });
  await ce.close();
});

await step("course quiz", async () => {
  await page.goto(R0 + "/fundamentals/quiz", { waitUntil: "networkidle" });
  const n = await page.locator('[data-testid^="quiz-"][data-testid$="-0"]').count();
  for (let i = 0; i < n; i++) await page.getByTestId(`quiz-${i}-0`).click();
  await page.getByTestId("quiz-submit").click();
  await page.getByTestId("quiz-score").waitFor({ timeout: 10000 });
  ok("course quiz: scored", true, (await page.getByTestId("quiz-score").innerText()).trim());
});

await step("final exam (practice paper)", async () => {
  await page.goto(R0 + "/near/quiz", { waitUntil: "networkidle" });
  ok("exam: start locked until prerequisites", await page.getByTestId("exam-start").isDisabled());
  await page.getByTestId("exam-practice").click();
  await page.getByTestId("exam-paper").waitFor({ timeout: 20000 });
  ok("exam: timer running", /\d+:\d\d/.test(await page.getByTestId("exam-timer").innerText()));
  const html = await page.content();
  ok("exam: no answer key in the page", !html.includes('"answer"'));
  for (const fs of await page.locator("[data-testid=exam-paper] fieldset").all()) await fs.locator("input[type=radio]").first().check();
  await page.screenshot({ path: OUT + "exam-paper.png" });
  page.once("dialog", (d) => d.accept());
  await page.getByTestId("exam-submit").click();
  await page.getByTestId("exam-result").waitFor({ timeout: 30000 });
  ok("exam: server-graded result", true, (await page.getByTestId("exam-score").innerText()).trim());
  await page.screenshot({ path: OUT + "exam-result.png", fullPage: true });
});

await step("exam API", async () => {
  const r = await fetch(R0 + "/api/exam/start", { method: "POST" });
  const j = await r.json();
  if (r.status === 429) return ok("exam API: start (rate limited or cooldown)", true, j.error);
  if (j.practice) ok("exam API: practice bank served (server has no EXAM_BANK_KEY, cannot mint)", j.questions?.length === 5 && j.tasks?.length === 3);
  else ok("exam API: 25 questions + 3 tasks, 40 points", j.questions?.length === 25 && j.tasks?.length === 3 && j.maxScore === 40, `${j.questions?.length}/${j.tasks?.length}/${j.maxScore}`);
  ok("exam API: no answers or hidden tests sent", !JSON.stringify(j).includes('"answer"') && j.tasks.every((t) => t.visibleTests.length < 5));
  const bad = await fetch(R0 + "/api/grade", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ track: "near", examToken: "x.y.z", answers: {}, code: {} }) });
  ok("exam API: tampered session rejected", bad.status === 400 || bad.status === 429, String(bad.status));
});

await step("verify", async () => {
  await page.goto(R0 + `/verify?account=${HOLDER}`, { waitUntil: "networkidle" });
  await page.getByTestId("diploma-card").waitFor({ timeout: 20000 });
  ok("verify: certificate found", true, (await page.getByTestId("diploma-score").innerText()).trim());
  await page.getByTestId("verify-input").fill("nobody-here-123.testnet");
  await page.getByTestId("verify-submit").click();
  await page.getByTestId("verify-none").waitFor({ timeout: 20000 });
  ok("verify: negative case", true);
});

await step("leaderboard + share", async () => {
  await page.goto(R0 + "/leaderboard", { waitUntil: "networkidle" });
  const rows = await page.getByTestId("leaderboard-row").count();
  ok("leaderboard: rows from chain", rows >= 1, `${rows} rows`);
  await page.goto(`${R0}/d/${HOLDER}`, { waitUntil: "networkidle" });
  const og = await page.locator('meta[property="og:image"]').getAttribute("content");
  ok("share page: certificate OG image", Boolean(og?.includes("/api/diploma/near/")));
  const art = await fetch(`${R0}/api/diploma/near/${HOLDER}`);
  ok("certificate art is a PNG", art.ok && art.headers.get("content-type") === "image/png");
});

await step("advanced lock", async () => {
  await page.goto(R0 + "/advanced/testing-contracts", { waitUntil: "networkidle" });
  ok("advanced: locked for visitors", await page.getByTestId("holder-locked").isVisible());
  const raw = await (await fetch(R0 + "/advanced/testing-contracts")).text();
  ok("advanced: lesson body not in the HTML", !raw.includes("mint_end_to_end"));
});

await step("404 + theme", async () => {
  const r = await page.goto(R0 + "/no-such-page", { waitUntil: "networkidle" });
  ok("404 page", r.status() === 404 && (await page.getByRole("link", { name: /home|path|courses/i }).count()) > 0);
  await page.goto(R0, { waitUntil: "networkidle" });
  const before = await page.evaluate(() => document.documentElement.className + document.documentElement.dataset.theme);
  await page.getByTestId("theme-toggle").first().click();
  const after = await page.evaluate(() => document.documentElement.className + document.documentElement.dataset.theme);
  ok("theme toggle switches theme", before !== after);
});

await step("mobile", async () => {
  const m = await browser.newContext({ ...devices["iPhone 13"] });
  const mp = await m.newPage();
  for (const p of ["/", "/fundamentals/transactions-and-gas", "/near/quiz", "/leaderboard"]) {
    await mp.goto(R0 + p, { waitUntil: "networkidle" });
    ok(`mobile: no horizontal overflow ${p}`, !(await mp.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)));
  }
  await mp.goto(R0, { waitUntil: "networkidle" });
  await mp.screenshot({ path: OUT + "home-mobile.png" });
  await m.close();
});

ok("no uncaught page errors", consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" | "));
await browser.close();
const failed = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
