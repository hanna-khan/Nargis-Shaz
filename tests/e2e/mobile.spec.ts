import { expect, test } from "@playwright/test";

test("mobile: home, menu, product and bag work at phone width", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.getByRole("button", { name: /menu/i }).first().click();
  await expect(page.getByRole("dialog").first()).toBeVisible();
  await page.keyboard.press("Escape");
  await page.goto("/products/aaliya-poplin-shirt");
  await page.locator("#size-picker button[aria-pressed]:not([disabled])").first().click();
  await page.getByRole("button", { name: /^Add to bag$/ }).first().click();
  await expect(page.getByRole("dialog", { name: "Your bag" })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  expect(errors).toEqual([]);
});
