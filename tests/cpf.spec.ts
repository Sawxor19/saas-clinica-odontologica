import { test, expect } from "@playwright/test";
import { validateCPF } from "../src/utils/validation/cpf";

test("validateCPF accepts valid numbers", () => {
  expect(validateCPF("529.982.247-25")).toBeTruthy();
});

test("validateCPF rejects invalid numbers", () => {
  expect(validateCPF("111.111.111-11")).toBeFalsy();
  expect(validateCPF("123.456.789-00")).toBeFalsy();
});
