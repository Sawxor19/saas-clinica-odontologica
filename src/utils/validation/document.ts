import { validateCPF } from "@/utils/validation/cpf";

export type DocumentType = "cpf" | "cnpj";

export function normalizeDocument(value: string) {
  return String(value || "").replace(/\D/g, "");
}

export function validateCNPJ(value: string) {
  const cnpj = normalizeDocument(value);
  if (!cnpj || cnpj.length !== 14) return false;
  if (/^(\d)\1+$/.test(cnpj)) return false;

  const calculateDigit = (base: string, factors: number[]) => {
    const total = factors.reduce((sum, factor, index) => {
      return sum + Number(base[index]) * factor;
    }, 0);
    const remainder = total % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const firstDigit = calculateDigit(cnpj.slice(0, 12), [
    5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2,
  ]);
  const secondDigit = calculateDigit(cnpj.slice(0, 12) + String(firstDigit), [
    6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2,
  ]);

  return cnpj === cnpj.slice(0, 12) + String(firstDigit) + String(secondDigit);
}

export function validateDocumentByType(value: string, type: DocumentType) {
  if (type === "cnpj") return validateCNPJ(value);
  return validateCPF(value);
}

export function documentTypeLabel(type: DocumentType) {
  return type === "cnpj" ? "CNPJ" : "CPF";
}
