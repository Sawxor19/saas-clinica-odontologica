export function normalizePhoneToE164(value: string) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  if (raw.startsWith("+")) {
    const digits = raw.replace(/\D/g, "");
    return digits.length >= 10 ? `+${digits}` : null;
  }

  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) {
    return `+55${digits}`;
  }
  if (digits.startsWith("55") && digits.length >= 12) {
    return `+${digits}`;
  }
  return digits.length >= 10 ? `+${digits}` : null;
}
