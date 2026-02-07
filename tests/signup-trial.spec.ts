import { test, expect } from "@playwright/test";

test("signup trial form available", async ({ page }) => {
  await page.goto("/signup");
  await expect(page.getByRole("heading", { name: "Crie sua conta" })).toBeVisible();
  await expect(page.getByRole("button", { name: /continuar para pagamento/i })).toBeVisible();
});
