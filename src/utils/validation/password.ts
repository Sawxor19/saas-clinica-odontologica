export type PasswordChecks = {
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasSpecialChar: boolean;
  hasMinLength: boolean;
  score: number;
};

export function getPasswordChecks(password: string): PasswordChecks {
  const value = String(password || "");
  const hasUppercase = /[A-Z]/.test(value);
  const hasLowercase = /[a-z]/.test(value);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(value);
  const hasMinLength = value.length >= 8;

  const score = [hasUppercase, hasLowercase, hasSpecialChar, hasMinLength].filter(
    Boolean
  ).length;

  return {
    hasUppercase,
    hasLowercase,
    hasSpecialChar,
    hasMinLength,
    score,
  };
}

export function isStrongPassword(password: string) {
  return getPasswordChecks(password).score === 4;
}

export function getPasswordStrengthLabel(score: number) {
  if (score >= 4) return "forte";
  if (score >= 2) return "media";
  return "fraca";
}
