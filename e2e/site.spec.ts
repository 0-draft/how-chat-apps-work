import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

const BASE = "/how-chat-apps-work/";
const pages = [
  { lang: "en", path: BASE, next: "Next step", send: "Send", open: "Open chat", resend: "Resend" },
  {
    lang: "ja",
    path: `${BASE}ja/`,
    next: "次のステップ",
    send: "送信",
    open: "トークを開く",
    resend: "再送",
  },
] as const;

async function noOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

for (const p of pages) {
  test.describe(p.lang, () => {
    test.beforeEach(async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(String(e)));
      await page.goto(p.path);
      test.info().annotations.push({ type: "errors", description: errors.join("\n") });
    });

    test("renders every chapter with its diagram", async ({ page }) => {
      await expect(page.locator("html")).toHaveAttribute("lang", p.lang);
      await expect(page.locator("seq-player")).toHaveCount(7);
      for (const player of await page.locator("seq-player").all()) {
        await expect(player).toHaveClass(/is-live/);
        await expect(player.locator(".stage-count")).toHaveText(/^1 \/ \d+$/);
      }
      await noOverflow(page);
    });

    test("steps through a sequence with buttons and keys", async ({ page }) => {
      const player = page.locator('seq-player[data-seq="retry"]');
      await page.locator('a[href="#retry-1"]').first().click();
      await expect(player).toHaveAttribute("data-step", "0");
      await player.getByRole("button", { name: p.next }).click();
      await player.getByRole("button", { name: p.next }).click();
      await expect(player).toHaveAttribute("data-step", "2");
      await expect(player.locator(".step.is-current.step--lost")).toHaveCount(1);
      await player.locator(".stage").focus();
      await page.keyboard.press("ArrowLeft");
      await expect(player).toHaveAttribute("data-step", "1");
    });

    test("an in-text link jumps the diagram to that step", async ({ page }) => {
      await page.locator('a[href="#overview-8"]').first().click();
      await expect(page.locator('seq-player[data-seq="overview"]')).toHaveAttribute(
        "data-step",
        "7",
      );
    });

    test("simulator: offline delivery, lost ACK, dedup and read", async ({ page }) => {
      const sim = page.locator(".sim");
      await sim.scrollIntoViewIfNeeded();
      const a = sim.locator('.phone[data-user="A"]');
      const b = sim.locator('.phone[data-user="B"]');
      await expect(a.getByRole("switch")).toBeEnabled();

      await b.getByRole("switch").uncheck();
      await a.getByRole("textbox").fill("hi");
      await a.getByRole("button", { name: p.send, exact: true }).click();
      await expect(b.locator(".theirs")).toHaveCount(0);
      await b.getByRole("switch").check();
      await expect(b.locator(".theirs")).toHaveCount(1);

      await sim.locator(".server").getByRole("switch").check();
      await a.getByRole("textbox").fill("twice?");
      await a.getByRole("button", { name: p.send, exact: true }).click();
      await a.getByRole("button", { name: p.resend }).click();
      await expect(sim.locator(".server tbody tr")).toHaveCount(2);
      await expect(b.locator(".theirs")).toHaveCount(2);

      await b.getByRole("button", { name: p.open }).click();
      await expect(a.locator('.mine small[data-status="read"]')).toHaveCount(2);
    });

    test("has no detectable accessibility violations", async ({ page }) => {
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.length}`)).toEqual([]);
    });
  });
}

test("language switch links the two versions", async ({ page }) => {
  await page.goto(BASE);
  await page.getByRole("link", { name: "日本語" }).click();
  await expect(page).toHaveURL(new RegExp(`${BASE}ja/$`));
  await expect(page.locator("html")).toHaveAttribute("lang", "ja");
});
