import { randomInt } from "crypto";
import { constantTimeCompare, hmacSha256 } from "@/utils/security/hmac";

export function generateOtp(length = 6) {
  const max = 10 ** length;
  return String(randomInt(0, max)).padStart(length, "0");
}

export function hashOtp(secret: string, otp: string) {
  return hmacSha256(secret, otp);
}

export function verifyOtp(secret: string, otp: string, otpHash: string) {
  return constantTimeCompare(hashOtp(secret, otp), otpHash);
}

export type OtpVerificationInput = {
  now: Date;
  otpHash: string | null;
  otp: string;
  attempts: number;
  expiresAt: Date | null;
  lockedUntil: Date | null;
  maxAttempts?: number;
  lockoutMinutes?: number;
  secret: string;
};

export type OtpVerificationResult = {
  status: "valid" | "invalid" | "expired" | "locked";
  attempts: number;
  lockedUntil: Date | null;
};

export function computeOtpVerification(input: OtpVerificationInput): OtpVerificationResult {
  const maxAttempts = input.maxAttempts ?? 5;
  const lockoutMinutes = input.lockoutMinutes ?? 15;

  if (input.lockedUntil && input.now < input.lockedUntil) {
    return { status: "locked", attempts: input.attempts, lockedUntil: input.lockedUntil };
  }

  if (!input.otpHash || !input.expiresAt || input.now > input.expiresAt) {
    return { status: "expired", attempts: input.attempts, lockedUntil: null };
  }

  if (verifyOtp(input.secret, input.otp, input.otpHash)) {
    return { status: "valid", attempts: input.attempts, lockedUntil: null };
  }

  const nextAttempts = input.attempts + 1;
  if (nextAttempts >= maxAttempts) {
    const lockedUntil = new Date(input.now.getTime() + lockoutMinutes * 60 * 1000);
    return { status: "locked", attempts: nextAttempts, lockedUntil };
  }

  return { status: "invalid", attempts: nextAttempts, lockedUntil: null };
}
