import { createHmac, timingSafeEqual } from "crypto";

export function hmacSha256(secret: string, value: string) {
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function constantTimeCompare(a: string, b: string) {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) {
    return false;
  }
  return timingSafeEqual(bufferA, bufferB);
}
