import crypto from "crypto";

const SECRET = process.env.ENCRYPTION_SECRET || process.env.NEXTAUTH_SECRET || "ai-music-prompt-generator-default-secret-key-32bytes!";

// Derive a 32-byte key from the secret
const KEY = crypto.createHash("sha256").update(SECRET).digest();

/**
 * Encrypts plain text using AES-256-GCM.
 * Returns format: enc:<iv-hex>:<tag-hex>:<ciphertext-hex>
 */
export function encrypt(text: string): string {
  if (!text || text.trim() === "") return text;
  if (text.startsWith("enc:")) return text; // Already encrypted

  try {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
    
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    
    const tag = cipher.getAuthTag().toString("hex");
    return `enc:${iv.toString("hex")}:${tag}:${encrypted}`;
  } catch (error) {
    console.error("Encryption error:", error);
    return text;
  }
}

/**
 * Decrypts encrypted text using AES-256-GCM.
 * Handles legacy unencrypted keys gracefully.
 */
export function decrypt(text: string): string {
  if (!text || !text.startsWith("enc:")) return text; // Legacy plain text or empty

  try {
    const parts = text.split(":");
    if (parts.length !== 4) return text;

    const iv = Buffer.from(parts[1], "hex");
    const tag = Buffer.from(parts[2], "hex");
    const encryptedText = parts[3];

    const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    console.error("Decryption error:", error);
    return text;
  }
}

/**
 * Masks an API key for safe display in the UI (e.g. sk-proj-...a8F9)
 */
export function maskApiKey(key: string): string {
  const plain = decrypt(key);
  if (!plain || plain.length < 8) return "••••••••";
  return `${plain.slice(0, 6)}...${plain.slice(-4)}`;
}
