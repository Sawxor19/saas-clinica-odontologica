import { test, expect } from "@playwright/test";

const email = process.env.E2E_EXPIRED_EMAIL;
const password = process.env.E2E_EXPIRED_PASSWORD;

test.skip(!email || !password, "Missing expired subscription credentials");

test("clinic without active subscription blocked", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("Email").fill(email!);
  await page.getByPlaceholder("Senha").fill(password!);
  await page.getByRole("button", { name: "Acessar" }).click();
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/billing\/blocked/);
});
