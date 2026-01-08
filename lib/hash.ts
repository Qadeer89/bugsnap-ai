import crypto from "crypto";

export function hashImage(base64: string) {
  return crypto.createHash("sha256").update(base64).digest("hex");
}
