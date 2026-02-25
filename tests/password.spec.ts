import { test, expect } from "@playwright/test";
import { getPasswordChecks, isStrongPassword } from "../src/utils/validation/password";

test("isStrongPassword accepts password with all required rules", () => {
  expect(isStrongPassword("Senha@123")).toBeTruthy();
});

test("isStrongPassword rejects weak passwords", () => {
  expect(isStrongPassword("abcdefghi")).toBeFalsy();
  expect(isStrongPassword("ABCDEFGH")).toBeFalsy();
  expect(isStrongPassword("Senha1234")).toBeFalsy();
});

test("getPasswordChecks returns expected score", () => {
  const checks = getPasswordChecks("Senha@123");
  expect(checks.score).toBe(4);
});
