import { createDecipheriv, createHmac, timingSafeEqual } from "node:crypto";

function decodeBase32(value: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const clean = value.toUpperCase().replace(/=|\s|-/g, "");
  let bits = "";
  for (const char of clean) {
    const index = alphabet.indexOf(char);
    if (index < 0) throw new Error("Invalid base32 secret");
    bits += index.toString(2).padStart(5, "0");
  }
  const bytes: number[] = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  return Buffer.from(bytes);
}

function generateCode(secret: string, counter: number): string {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", decodeBase32(secret)).update(buffer).digest();
  const offset = (digest.at(-1) ?? 0) & 0x0f;
  const byte0 = digest.at(offset) ?? 0;
  const byte1 = digest.at(offset + 1) ?? 0;
  const byte2 = digest.at(offset + 2) ?? 0;
  const byte3 = digest.at(offset + 3) ?? 0;
  const binary = ((byte0 & 0x7f) << 24) | ((byte1 & 0xff) << 16) | ((byte2 & 0xff) << 8) | (byte3 & 0xff);
  return String(binary % 1_000_000).padStart(6, "0");
}

export function decryptTotpSecret(payload: string, encryptionKey: string): string {
  const [version, ivHex, tagHex, cipherHex] = payload.split(":");
  if (version !== "v1" || !ivHex || !tagHex || !cipherHex || !/^[a-f\d]{64}$/i.test(encryptionKey)) {
    throw new Error("Invalid encrypted TOTP secret");
  }
  const decipher = createDecipheriv("aes-256-gcm", Buffer.from(encryptionKey, "hex"), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(cipherHex, "hex")), decipher.final()]).toString("utf8");
}

export function verifyTotpCode(secret: string, code: string, now = Date.now()): boolean {
  if (!/^\d{6}$/.test(code)) return false;
  const counter = Math.floor(now / 30_000);
  for (let window = -1; window <= 1; window += 1) {
    const expected = Buffer.from(generateCode(secret, counter + window));
    const received = Buffer.from(code);
    if (expected.length === received.length && timingSafeEqual(expected, received)) return true;
  }
  return false;
}
