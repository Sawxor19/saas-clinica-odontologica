import crypto from "crypto";

type CaptchaPayload = {
  a: number;
  b: number;
  token: string;
};

function getCaptchaSecret() {
  const secret = process.env.SIGNUP_HMAC_SECRET || process.env.SIGNUP_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error("Missing CAPTCHA secret");
  }
  return secret;
}

function signCaptcha(a: number, b: number) {
  const secret = getCaptchaSecret();
  return crypto
    .createHmac("sha256", secret)
    .update(`${a}:${b}`)
    .digest("hex");
}

export function createCaptcha(): CaptchaPayload {
  const a = crypto.randomInt(1, 10);
  const b = crypto.randomInt(1, 10);
  const token = signCaptcha(a, b);
  return { a, b, token };
}

export function verifyCaptcha(input: {
  a: number;
  b: number;
  token: string;
  answer: string;
}) {
  const expected = signCaptcha(input.a, input.b);
  if (!input.token || input.token.length !== expected.length) {
    return false;
  }
  const tokenBuffer = Buffer.from(input.token);
  const expectedBuffer = Buffer.from(expected);
  if (!crypto.timingSafeEqual(tokenBuffer, expectedBuffer)) {
    return false;
  }
  const answer = Number(input.answer.trim());
  if (!Number.isFinite(answer)) {
    return false;
  }
  return answer === input.a + input.b;
}
