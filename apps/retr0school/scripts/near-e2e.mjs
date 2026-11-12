// Headless end-to-end check of the deployed judge flow + screenshots.
// Run from apps/retr0school (uses its Playwright): node scripts/near-e2e.mjs
import { chromium } from "@playwright/test";

const R0 = process.env.R0_URL || "https://retr0school-near.vercel.app";
const CE = process.env.CE_URL || "https://code-e-near.vercel.app";
const OUT = new URL("../../../artifacts/", import.meta.url).pathname;
const KEY = [1, 1, 2, 0, 3, 1, 1, 0];
const results = [];
const ok = (name, pass, detail = "") => {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"} ${name} ${detail}`);
};

const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const ctx = await browser.newContext({ viewport: { width: 1366, height: 860 }, colorScheme: "dark" });
const page = await ctx.newPage();

try {
  // 1. Home
  await page.goto(R0, { waitUntil: "networkidle" });
  ok("home hero", await page.getByText("Earn it on-chain.").isVisible());
  ok("connect button", await page.getByTestId("near-connect").isVisible());
  await page.screenshot({ path: OUT + "01-home.png" });

  // 2. Lesson with Open in Code E
  await page.goto(R0 + "/near/view-vs-change-calls", { waitUntil: "networkidle" });
  const link = page.getByTestId("open-in-code-e").first();
  const href = await link.getAttribute("href");
  ok("open in code e link", Boolean(href && href.startsWith(CE + "/#code=")), href?.slice(0, 60));
  await page.screenshot({ path: OUT + "02-lesson-view-call.png", fullPage: false });
  await link.scrollIntoViewIfNeeded();
  await page.screenshot({ path: OUT + "03-lesson-open-in-code-e.png" });

  // 3. Follow the link into Code E and run the verify example
  const ce = await ctx.newPage();
  await ce.goto(href, { waitUntil: "networkidle" });
  const frame = ce.frameLocator("#preview");
  await frame.locator("#go").click();
  await frame.locator("#out").filter({ hasText: "demo-learner" }).waitFor({ timeout: 20000 });
  ok("code e runs lesson example (verify_diploma)", (await frame.locator("#out").innerText()).includes('"valid": true'));
  await ce.screenshot({ path: OUT + "04-code-e-lesson-example.png" });

  await ce.close();

  // 4. Code E NEAR starter (fresh tab, like a judge clicking the link)
  const ce2 = await ctx.newPage();
  await ce2.goto(CE + "/#template=near", { waitUntil: "networkidle" });
  const sf = ce2.frameLocator("#preview");
  await sf.locator("#connect").click();
  await sf.locator("#account-out").filter({ hasText: "Balance:" }).waitFor({ timeout: 20000 });
  await sf.locator("#verify").click();
  await sf.locator("#diploma-out").filter({ hasText: "Valid diploma" }).waitFor({ timeout: 20000 });
  ok("code e near starter connect + view call", true, await sf.locator("#diploma-out").innerText());
  await ce2.screenshot({ path: OUT + "05-code-e-near-starter.png" });
  await ce2.close();

  // 5. Public verify page
  await page.goto(R0 + "/verify?account=demo-learner.retr0school.testnet", { waitUntil: "networkidle" });
  await page.getByTestId("diploma-card").waitFor({ timeout: 20000 });
  ok("verify page shows diploma", (await page.getByTestId("diploma-score").innerText()).trim() === "7/8");
  await page.screenshot({ path: OUT + "06-verify-page.png" });
  await page.getByTestId("verify-input").fill("nobody-here-123.testnet");
  await page.getByTestId("verify-submit").click();
  await page.getByTestId("verify-none").waitFor({ timeout: 20000 });
  ok("verify page negative case", true);

  // 6. Quiz pass
  await page.goto(R0 + "/near/quiz", { waitUntil: "networkidle" });
  for (let i = 0; i < KEY.length; i++) await page.getByTestId(`quiz-${i}-${KEY[i]}`).click();
  await page.getByTestId("quiz-submit").click();
  await page.getByTestId("near-diploma-cta").waitFor();
  ok("quiz pass unlocks diploma", true);
  await page.getByTestId("near-diploma-cta").scrollIntoViewIfNeeded();
  await page.screenshot({ path: OUT + "07-quiz-passed.png" });

  // 7. Diploma page + wallet selector modal
  await page.goto(R0 + "/diploma", { waitUntil: "networkidle" });
  await page.getByText("Your score:").waitFor();
  await page.screenshot({ path: OUT + "08-diploma-page.png" });
  await page.getByTestId("diploma-connect").click();
  await page.locator(".nws-modal-wrapper.open").waitFor({ timeout: 15000 });
  await page.waitForTimeout(800); // modal fade-in
  const meteor = await page.getByText("Meteor Wallet").first().isVisible().catch(() => false);
  ok("wallet selector modal lists MyNearWallet + Meteor", meteor);
  await page.screenshot({ path: OUT + "09-wallet-selector-modal.png" });
} catch (error) {
  ok("unexpected error", false, String(error));
  for (const [i, p] of ctx.pages().entries()) await p.screenshot({ path: OUT + `error-${i}.png` }).catch(() => {});
} finally {
  await browser.close();
}
const failed = results.filter((r) => !r.pass).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
