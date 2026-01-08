export function validateBase64Image(base64: string) {
  // Format: data:image/png;base64,....
  if (!base64.startsWith("data:image/")) {
    return { ok: false, error: "INVALID_IMAGE_FORMAT" };
  }

  // Extract mime
  const match = base64.match(/^data:image\/(png|jpeg|jpg|webp);base64,/);
  if (!match) {
    return { ok: false, error: "UNSUPPORTED_IMAGE_TYPE" };
  }

  // Estimate size
  const sizeInBytes =
    (base64.length * 3) / 4 - (base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0);

  const MAX_SIZE = 2 * 1024 * 1024; // 2MB

  if (sizeInBytes > MAX_SIZE) {
    return { ok: false, error: "IMAGE_TOO_LARGE" };
  }

  return { ok: true };
}
