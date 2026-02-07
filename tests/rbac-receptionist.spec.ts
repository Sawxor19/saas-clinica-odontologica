import { test, expect } from "@playwright/test";

const email = process.env.E2E_RECEPTIONIST_EMAIL;
const password = process.env.E2E_RECEPTIONIST_PASSWORD;

test.skip(!email || !password, "Missing receptionist credentials");

test("receptionist blocked from clinical records", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("Email").fill(email!);
  await page.getByPlaceholder("Senha").fill(password!);
  await page.getByRole("button", { name: "Acessar" }).click();
  await page.goto("/dashboard/records");
  await expect(page.getByRole("heading", { name: "Acesso negado" })).toBeVisible();
});
