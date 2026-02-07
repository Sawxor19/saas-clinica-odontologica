import { test, expect } from "@playwright/test";
import { computeOtpVerification, hashOtp } from "../src/utils/security/otp";

const secret = "test-secret";

function baseInput(overrides?: Partial<Parameters<typeof computeOtpVerification>[0]>) {
  return {
    now: new Date("2026-02-04T10:00:00Z"),
    otpHash: hashOtp(secret, "123456"),
    otp: "123456",
    attempts: 0,
    expiresAt: new Date("2026-02-04T10:10:00Z"),
    lockedUntil: null,
    secret,
    ...overrides,
  };
}

test("otp expires when past expiry", () => {
  const result = computeOtpVerification(
    baseInput({ expiresAt: new Date("2026-02-04T09:00:00Z") })
  );
  expect(result.status).toBe("expired");
});

test("otp increments attempts on invalid", () => {
  const result = computeOtpVerification(baseInput({ otp: "000000" }));
  expect(result.status).toBe("invalid");
  expect(result.attempts).toBe(1);
});

test("otp locks after max attempts", () => {
  const result = computeOtpVerification(baseInput({ otp: "000000", attempts: 4 }));
  expect(result.status).toBe("locked");
  expect(result.lockedUntil).not.toBeNull();
});

test("otp validates when correct", () => {
  const result = computeOtpVerification(baseInput());
  expect(result.status).toBe("valid");
});
