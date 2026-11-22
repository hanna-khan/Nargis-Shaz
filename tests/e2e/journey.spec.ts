import { expect, test, type Page } from "@playwright/test";
import mysql from "mysql2/promise";

/**
 * Full customer → Studio → customer journey, verified against the database.
 * Owner credentials come from the dev seed (SEED_OWNER_EMAIL / SEED_OWNER_PASSWORD).
 */
const DB = process.env.DATABASE_URL ?? "mysql://ns:ns_dev_password@localhost:3306/nargis_shaz";
const OWNER = { email: process.env.E2E_OWNER_EMAIL ?? "owner@nargisandshaz.test", password: process.env.E2E_OWNER_PASSWORD ?? "Atelier-2026!secure" };
const stamp = Date.now().toString(36);
const customer = { email: `e2e-${stamp}@example.test`, password: "Journey-2026!pass" };
let orderNumber = "";

async function query<T>(sql: string, params: unknown[] = []) {
  const c = await mysql.createConnection(DB);
  try { return (await c.query(sql, params))[0] as T[]; } finally { await c.end(); }
}

async function addFirstInStockSize(page: Page) {
  const sizes = page.locator("#size-picker button[aria-pressed]:not([disabled])");
  await expect(sizes.first()).toBeVisible();
  await sizes.first().click();
  await page.getByRole("button", { name: /^Add to bag$/ }).click();
  await expect(page.getByRole("dialog", { name: "Your bag" })).toBeVisible();
}

async function fillAddress(page: Page, a: { first: string; last: string; line1: string; city: string; phone: string; province?: string; postcode?: string }) {
  const f = page.locator("main #checkout-form"); // streamed Suspense content briefly sits in a hidden holder outside <main>
  await f.getByLabel("First name", { exact: true }).fill(a.first);
  await f.getByLabel("Last name", { exact: true }).fill(a.last);
  await f.getByLabel(/^(House \/ street address|Address)$/).fill(a.line1);
  await f.getByLabel("City", { exact: true }).fill(a.city);
  if (a.province) await f.getByRole("combobox", { name: "Province", exact: true }).selectOption(a.province);
  if (a.postcode) await f.getByLabel(/^(Postcode|Postal code|ZIP code)$/).fill(a.postcode);
  await f.getByLabel(/^Phone/).fill(a.phone);
}

test.describe.serial("customer journey with COD and Studio fulfilment", () => {
  test("1–2. register and sign in", async ({ page }) => {
    await page.goto("/account/register");
    await page.getByLabel("First name").fill("Ayesha");
    await page.getByLabel("Last name").fill("Journey");
    await page.getByLabel("Email", { exact: true }).fill(customer.email);
    await page.getByLabel("Password").fill(customer.password);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/account$/);
    await expect(page.getByRole("heading", { name: "Your account" })).toBeVisible();
    const [u] = await query<{ email: string }>("SELECT email FROM users WHERE email = ?", [customer.email]);
    expect(u.email).toBe(customer.email);
  });

  test("3–10. browse, filter, add to bag, coupon, COD checkout", async ({ page }) => {
    await page.goto("/account/login");
    await page.getByLabel("Email", { exact: true }).fill(customer.email);
    await page.getByLabel("Password").fill(customer.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/account$/);

    await page.goto("/shop/dresses");
    await expect(page.getByText(/\d+ pieces?/).first()).toBeVisible();
    await page.getByRole("button", { name: /Filter & sort/ }).click();
    await page.getByRole("radio", { name: "Price: low to high" }).click();
    await expect(page).toHaveURL(/sort=price-asc/);
    await page.getByRole("button", { name: /^Show \d+ pieces?$/ }).click();

    await page.goto("/products/aaliya-poplin-shirt");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Aaliya");
    await addFirstInStockSize(page);
    await page.goto("/cart");
    await page.getByLabel("Discount code").fill("WELCOME10");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page.getByText(/Discount \(WELCOME10\)/)).toBeVisible();

    await page.goto("/checkout");
    await expect(page.getByText(`Signed in as ${customer.email}`)).toBeVisible();
    await fillAddress(page, { first: "Ayesha", last: "Journey", line1: "21 Main Boulevard, Gulberg", city: "Lahore", province: "Punjab", phone: "300 1234567" });
    await page.getByRole("radio", { name: /Cash on delivery/ }).check();
    await page.getByRole("button", { name: /^Place order/ }).click();
    await expect(page).toHaveURL(/\/checkout\/confirmation\//);
    await expect(page.getByRole("heading", { name: "Thank you" })).toBeVisible();
    orderNumber = decodeURIComponent(new URL(page.url()).pathname.split("/").pop()!);

    const [o] = await query<{ status: string; payment_status: string; discount_total: number; coupon_code: string }>("SELECT status, payment_status, discount_total, coupon_code FROM orders WHERE number = ?", [orderNumber]);
    expect(o).toMatchObject({ status: "pending", payment_status: "awaiting_cod", coupon_code: "WELCOME10" });
    expect(o.discount_total).toBeGreaterThan(0);
  });

  test("11–14. Studio: view, process and ship the order", async ({ page }) => {
    page.on("dialog", (d) => d.accept());
    await page.goto("/admin/login");
    await page.getByLabel("Email", { exact: true }).fill(OWNER.email);
    await page.getByLabel("Password").fill(OWNER.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("heading", { name: /Good day/ })).toBeVisible();

    await page.goto(`/admin/orders?q=${orderNumber}`);
    await page.getByRole("link", { name: orderNumber, exact: true }).click();
    await expect(page.getByRole("heading", { name: `Order ${orderNumber}` })).toBeVisible();
    await page.getByRole("button", { name: "Mark confirmed" }).click();
    await expect(page.getByRole("button", { name: "Mark processing" })).toBeVisible();
    await page.getByRole("button", { name: "Mark processing" }).click();
    await expect(page.getByRole("button", { name: /Add shipment & tracking/ })).toBeVisible();
    const disclosure = page.getByRole("button", { name: /Add shipment & tracking/ });
    if ((await disclosure.getAttribute("aria-expanded")) !== "true") await disclosure.click();
    await page.getByLabel("Carrier").fill("TCS");
    await page.getByLabel("Tracking number").fill(`TCS${stamp.toUpperCase()}`);
    await page.getByRole("button", { name: "Add shipment", exact: true }).click();
    await expect(page.getByText(/the order is now shipped/)).toBeVisible();

    const [o] = await query<{ status: string }>("SELECT status FROM orders WHERE number = ?", [orderNumber]);
    expect(o.status).toBe("shipped");
  });

  test("15–16. customer sees tracking; notifications were recorded", async ({ page }) => {
    await page.goto("/account/login");
    await page.getByLabel("Email", { exact: true }).fill(customer.email);
    await page.getByLabel("Password").fill(customer.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.goto(`/account/orders/${orderNumber}`);
    await expect(page.getByText(`TCS · TCS${stamp.toUpperCase()}`)).toBeVisible();
    await expect(page.getByText("On its way").first()).toBeVisible();
    const mails = await query<{ template_key: string; status: string }>("SELECT n.template_key, n.status FROM notifications n JOIN orders o ON o.id = n.order_id WHERE o.number = ?", [orderNumber]);
    expect(mails.map((m) => m.template_key)).toEqual(expect.arrayContaining(["order_confirmation", "order_processing", "order_shipped"]));
    // Without RESEND_API_KEY nothing is pretended to be sent.
    expect(mails.every((m) => ["skipped", "sent"].includes(m.status))).toBe(true);
  });
});

test.describe("guest, international and payment outcomes", () => {
  async function guestToCheckout(page: Page, country: string) {
    await page.goto("/products/mehr-pleated-trousers");
    await addFirstInStockSize(page);
    await page.goto("/checkout");
    await page.getByLabel("Email", { exact: true }).fill(`guest-${Date.now()}@example.test`);
    await page.getByLabel("Country / region").selectOption(country);
  }

  test("guest UK checkout in GBP with an approved online payment", async ({ page }) => {
    await guestToCheckout(page, "GB");
    await expect(page.getByText("Prices are shown in GBP")).toBeVisible();
    await fillAddress(page, { first: "Hira", last: "Guest", line1: "10 Downing Street", city: "London", phone: "7700 900123", postcode: "SW1A 2AA" });
    await page.getByRole("button", { name: /^Continue to secure payment · £/ }).click();
    await expect(page.getByRole("heading", { name: "Simulated payment" })).toBeVisible();
    await page.getByRole("button", { name: "Approve payment" }).click();
    await expect(page).toHaveURL(/\/checkout\/confirmation\//);
    await expect(page.getByText("Your payment has been received.")).toBeVisible();
    const num = decodeURIComponent(new URL(page.url()).pathname.split("/").pop()!);
    const [o] = await query<{ currency: string; payment_status: string; status: string }>("SELECT currency, payment_status, status FROM orders WHERE number = ?", [num]);
    expect(o).toMatchObject({ currency: "GBP", payment_status: "paid", status: "confirmed" });
  });

  test("declined payment leaves the bag intact and releases stock", async ({ page }) => {
    await guestToCheckout(page, "PK");
    await fillAddress(page, { first: "Sana", last: "Declined", line1: "5 Clifton Block 2", city: "Karachi", province: "Sindh", phone: "321 7654321" });
    await page.getByRole("radio", { name: /test gateway/i }).check();
    await page.getByRole("button", { name: /^Continue to secure payment/ }).click();
    await page.getByRole("button", { name: "Decline payment" }).click();
    await expect(page.getByRole("heading", { name: "Payment not completed" })).toBeVisible();
    const num = decodeURIComponent(new URL(page.url()).pathname.split("/").pop()!);
    const [o] = await query<{ status: string; payment_status: string }>("SELECT status, payment_status FROM orders WHERE number = ?", [num]);
    expect(o).toMatchObject({ status: "cancelled", payment_status: "failed" });
    const [r] = await query<{ n: number }>("SELECT COUNT(*) n FROM stock_reservations r JOIN orders o ON o.id = r.order_id WHERE o.number = ? AND r.status = 'active'", [num]);
    expect(Number(r.n)).toBe(0);
    await page.goto("/cart");
    await expect(page.getByText("Mehr Pleated Trousers").first()).toBeVisible();
  });

  test("Studio is protected", async ({ page, request }) => {
    await page.goto("/admin/orders");
    await expect(page).toHaveURL(/\/admin\/login/);
    const res = await request.get("/admin/api/export/orders", { maxRedirects: 0 });
    expect([307, 401, 403]).toContain(res.status());
    const hook = await request.post("/api/webhooks/test", { data: "{}", headers: { "x-test-signature": "forged" } });
    expect(hook.status()).toBe(400);
    const csrf = await request.post("/api/cart", { data: { action: "add", variantId: "x", quantity: 1 }, headers: { origin: "https://evil.example" } });
    expect(csrf.status()).toBe(403);
  });
});

test.describe("regression: storefront", () => {
  test("navigation, mega menu, search, SEO and redirects", async ({ page, request }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.getByRole("button", { name: /Shop women/ }).first().hover().catch(() => undefined);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/search?q=satin");
    await expect(page.getByText(/\d+ pieces?/).first()).toBeVisible();
    const html = await (await request.get("/products/aaliya-poplin-shirt")).text();
    expect(html).toContain('"@type":"Product"');
    expect(html).toContain('rel="canonical"');
    const r = await request.get("/dresses", { maxRedirects: 0 });
    expect(r.status()).toBe(308);
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Disallow: /admin");
    expect(errors).toEqual([]);
  });
});
