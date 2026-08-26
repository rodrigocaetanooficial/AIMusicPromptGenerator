/**
 * Centralized validation utilities for the AI Music Prompt Studio.
 * Includes SSRF protection for user-supplied custom endpoints.
 *
 * Threat model: the "custom" provider lets a user type any base URL, and the
 * SERVER performs the fetch. Without checks, a user could point the endpoint at
 * the VPS's own loopback interface or at cloud metadata (169.254.169.254) and
 * use the app as a proxy into the private network.
 *
 * Local development is different: there, 127.0.0.1 is the developer's own
 * machine (Ollama, LM Studio, llama.cpp), so loopback is allowed when
 * NODE_ENV !== "production". RFC1918 / metadata ranges stay blocked always.
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/** Loopback hosts — allowed in dev, blocked in production. */
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0", "[::1]"]);

/** Cloud metadata endpoints — always blocked. */
const METADATA_HOSTS = new Set([
  "metadata.google.internal",
  "metadata.azure.com",
  "169.254.169.254",
  "metadata",
  "metadata.ec2.internal",
  "instance-data",
]);

export function isLoopbackHostname(hostname: string): boolean {
  return LOOPBACK_HOSTS.has(hostname.toLowerCase());
}

/**
 * True when the hostname points at a private / internal / metadata address.
 * Loopback is reported separately by isLoopbackHostname so callers can allow
 * it in development.
 */
export function isPrivateOrInternalHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");

  if (!host) return true;

  // Always-blocked metadata endpoints
  if (METADATA_HOSTS.has(host)) return true;

  // IPv4 literal ranges
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const a = Number(ipv4[1]);
    const b = Number(ipv4[2]);
    if ([a, b, Number(ipv4[3]), Number(ipv4[4])].some((n) => n > 255)) return true;
    if (a === 10) return true;                       // 10.0.0.0/8
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true;          // 192.168.0.0/16
    if (a === 169 && b === 254) return true;          // link-local / metadata
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
    if (a === 0) return true;                         // 0.0.0.0/8
    if (a === 127) return true;                       // loopback (checked separately too)
    if (a >= 224) return true;                        // multicast + reserved
    return false;
  }

  // IPv6 private / loopback / link-local
  if (host.includes(":")) {
    if (host === "::1" || host === "::") return true;
    if (host.startsWith("fc") || host.startsWith("fd")) return true; // unique local
    if (host.startsWith("fe80")) return true;                        // link-local
    return false;
  }

  // Internal-looking TLDs
  if (
    host.endsWith(".internal") ||
    host.endsWith(".local") ||
    host.endsWith(".localhost") ||
    host.endsWith(".home.arpa")
  ) {
    return true;
  }

  return false;
}

/**
 * Validate a user-supplied OpenAI-compatible base URL.
 * In production, loopback and private ranges are rejected (SSRF).
 * In development, loopback is allowed so local model servers work.
 */
export function validateCustomEndpoint(
  endpoint: string,
  opts?: { allowLoopback?: boolean },
): ValidationResult {
  if (!endpoint || !endpoint.trim()) {
    return { valid: false, error: "Endpoint is required" };
  }

  let url: URL;
  try {
    url = new URL(endpoint.trim());
  } catch {
    return { valid: false, error: "Invalid URL format (include http:// or https://)" };
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    return { valid: false, error: "Only HTTP and HTTPS endpoints are allowed" };
  }

  if (url.username || url.password) {
    return { valid: false, error: "Credentials in the URL are not allowed" };
  }

  const hostname = url.hostname;
  if (!hostname || hostname.length > 255) {
    return { valid: false, error: "Invalid hostname" };
  }

  if (url.port) {
    const port = Number(url.port);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      return { valid: false, error: "Invalid port number" };
    }
  }

  const allowLoopback =
    opts?.allowLoopback ?? process.env.NODE_ENV !== "production";

  if (isLoopbackHostname(hostname)) {
    if (allowLoopback) return { valid: true };
    return {
      valid: false,
      error:
        "Localhost endpoints are blocked on the hosted app. Run the app locally to use a local model server.",
    };
  }

  if (isPrivateOrInternalHostname(hostname)) {
    return {
      valid: false,
      error:
        "Private, internal, or cloud-metadata addresses are not allowed for security reasons.",
    };
  }

  return { valid: true };
}

/** Strip trailing slashes so `${base}/models` never double-slashes. */
export function normalizeEndpoint(endpoint: string): string {
  return endpoint.trim().replace(/\/+$/, "");
}

/** Best-effort provider hint from a hostname (UX only, never a security check). */
export function detectKnownProvider(endpoint: string): string | null {
  let hostname: string;
  try {
    hostname = new URL(endpoint).hostname.toLowerCase();
  } catch {
    return null;
  }
  if (isLoopbackHostname(hostname)) return "local";
  if (hostname.includes("openai.com")) return "openai";
  if (hostname.includes("groq.com")) return "groq";
  if (hostname.includes("together.ai") || hostname.includes("together.xyz")) return "together";
  if (hostname.includes("deepseek.com")) return "deepseek";
  if (hostname.includes("openrouter.ai")) return "openrouter";
  return null;
}

/** Shared fetch timeout for outbound provider calls (ms). */
export const PROVIDER_FETCH_TIMEOUT_MS = 15_000;

/** AbortSignal that fires after `ms`, for bounded outbound fetches. */
export function timeoutSignal(ms: number = PROVIDER_FETCH_TIMEOUT_MS): AbortSignal {
  return AbortSignal.timeout(ms);
}
