export function normalizeCPF(value: string) {
  return String(value || "").replace(/\D/g, "");
}

export function validateCPF(value: string) {
  const cpf = normalizeCPF(value);
  if (!cpf || cpf.length !== 11) return false;
  if (/^(\d)\1+$/.test(cpf)) return false;

  const calcDigit = (base: string, factor: number) => {
    let total = 0;
    for (const digit of base) {
      total += Number(digit) * factor--;
    }
    const rest = total % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  const first = calcDigit(cpf.slice(0, 9), 10);
  const second = calcDigit(cpf.slice(0, 9) + first, 11);
  return cpf === cpf.slice(0, 9) + String(first) + String(second);
}
