import { test, expect } from "@playwright/test";
import {
  validateCNPJ,
  validateDocumentByType,
} from "../src/utils/validation/document";

test("validateCNPJ accepts valid numbers", () => {
  expect(validateCNPJ("04.252.011/0001-10")).toBeTruthy();
});

test("validateCNPJ rejects invalid numbers", () => {
  expect(validateCNPJ("00.000.000/0000-00")).toBeFalsy();
  expect(validateCNPJ("04.252.011/0001-11")).toBeFalsy();
});

test("validateDocumentByType validates selected type", () => {
  expect(validateDocumentByType("529.982.247-25", "cpf")).toBeTruthy();
  expect(validateDocumentByType("529.982.247-25", "cnpj")).toBeFalsy();
});
