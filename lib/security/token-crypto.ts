const ENCRYPTION_PREFIX = "enc:v1:";

function getEncryptionKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Missing encryption key");
  return key;
}

export function encryptToken(token: string): string {
  const key = getEncryptionKey();
  const encoded = Buffer.from(token).toString("base64");
  const xored = encoded
    .split("")
    .map((c, i) =>
      String.fromCharCode(c.charCodeAt(0) ^ key.charCodeAt(i % key.length)),
    )
    .join("");
  return ENCRYPTION_PREFIX + Buffer.from(xored).toString("base64");
}

export function decryptToken(encrypted: string): string {
  if (!encrypted.startsWith(ENCRYPTION_PREFIX)) {
    return encrypted;
  }
  const key = getEncryptionKey();
  const xored = Buffer.from(
    encrypted.slice(ENCRYPTION_PREFIX.length),
    "base64",
  ).toString();
  const decoded = xored
    .split("")
    .map((c, i) =>
      String.fromCharCode(c.charCodeAt(0) ^ key.charCodeAt(i % key.length)),
    )
    .join("");
  return Buffer.from(decoded, "base64").toString("utf-8");
}
