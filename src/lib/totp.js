import { createCipheriv, createDecipheriv, createHmac, createHash, randomBytes, timingSafeEqual } from "crypto";
import QRCode from "qrcode";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const STEP = 30;
const DIGITS = 6;
const ISSUER = "Technonaire";

function sessionKey() {
  return createHash("sha256")
    .update(process.env.SESSION_SECRET || "dev-only-session-secret-change-me")
    .digest();
}

export function encryptTotpSecret(plain) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", sessionKey(), iv);
  const enc = Buffer.concat([cipher.update(String(plain), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}.${tag.toString("hex")}.${enc.toString("hex")}`;
}

export function decryptTotpSecret(stored) {
  const parts = String(stored || "").split(".");
  if (parts.length !== 3) throw new Error("Invalid authenticator secret");
  const [ivHex, tagHex, encHex] = parts;
  const decipher = createDecipheriv("aes-256-gcm", sessionKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(encHex, "hex")), decipher.final()]).toString(
    "utf8",
  );
}

function toBase32(buf) {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

function fromBase32(str) {
  const clean = String(str || "")
    .toUpperCase()
    .replace(/=+$/g, "")
    .replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const bytes = [];
  for (const ch of clean) {
    const idx = ALPHABET.indexOf(ch);
    if (idx < 0) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

export function generateTotpSecret() {
  return toBase32(randomBytes(20));
}

function hotp(secretB32, counter) {
  const key = fromBase32(secretB32);
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buf.writeUInt32BE(counter >>> 0, 4);
  const hmac = createHmac("sha1", key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const bin =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  const code = String(bin % 10 ** DIGITS);
  return code.padStart(DIGITS, "0");
}

export function totpAt(secretB32, atMs = Date.now()) {
  return hotp(secretB32, Math.floor(atMs / 1000 / STEP));
}

export function verifyTotpCode(secretB32, code, { window = 1 } = {}) {
  const expected = String(code || "").replace(/\s+/g, "");
  if (!/^\d{6}$/.test(expected)) return false;
  const now = Math.floor(Date.now() / 1000 / STEP);
  const target = Buffer.from(expected);
  for (let i = -window; i <= window; i++) {
    const candidate = Buffer.from(hotp(secretB32, now + i));
    if (candidate.length === target.length && timingSafeEqual(candidate, target)) return true;
  }
  return false;
}

export function totpOtpauthUrl(email, secretB32) {
  const account = encodeURIComponent(`${ISSUER}:${email}`);
  const params = new URLSearchParams({
    secret: secretB32,
    issuer: ISSUER,
    algorithm: "SHA1",
    digits: String(DIGITS),
    period: String(STEP),
  });
  return `otpauth://totp/${account}?${params.toString()}`;
}

export async function totpQrDataUrl(otpauth) {
  return QRCode.toDataURL(otpauth, {
    margin: 1,
    width: 220,
    color: { dark: "#04101f", light: "#ffffff" },
  });
}
