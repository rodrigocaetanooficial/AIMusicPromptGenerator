import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { providers } from "@/lib/types";
import {
  validateCustomEndpoint,
  normalizeEndpoint,
  PROVIDER_FETCH_TIMEOUT_MS,
} from "@/lib/validation";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIP } from "@/lib/client-ip";

const testConnectionSchema = z.object({
  provider: z.string().min(1),
  apiKey: z.string().optional(),
  customEndpoint: z.string().trim().url("Invalid endpoint URL").optional(),
});

function resolveBaseUrl(providerId: string, customEndpoint?: string): string {
  if (providerId === "custom") {
    if (!customEndpoint) {
      throw new Error("A custom endpoint URL is required for the Custom / Local provider.");
    }
    return normalizeEndpoint(customEndpoint);
  }
  const providerConfig = providers.find((p) => p.id === providerId);
  if (!providerConfig) throw new Error("Unknown provider");
  return normalizeEndpoint(providerConfig.baseUrl);
}

export async function POST(request: NextRequest) {
  try {
    // Tighter limit than /api/models: this endpoint exists purely to probe a
    // user-supplied URL, so it is the most attractive one to abuse.
    const ip = getClientIP(request);
    const limited = rateLimit(`test-connection:${ip}`, 10, 60_000);
    if (!limited.ok) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many connection tests. Please wait a moment and try again.",
        },
        { status: 429, headers: { "Retry-After": String(limited.retryAfterSec ?? 60) } }
      );
    }

    const rawBody = await request.json();
    const result = testConnectionSchema.safeParse(rawBody);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.issues[0]?.message || "Invalid parameters" },
        { status: 400 }
      );
    }

    const { provider: providerId, apiKey, customEndpoint } = result.data;

    // SSRF protection for the user-supplied custom endpoint
    if (providerId === "custom") {
      if (!customEndpoint) {
        return NextResponse.json(
          { success: false, error: "Enter an endpoint URL first." },
          { status: 400 }
        );
      }
      const validation = validateCustomEndpoint(customEndpoint);
      if (!validation.valid) {
        return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
      }
    }

    if (providerId !== "custom" && !apiKey) {
      return NextResponse.json(
        { success: false, error: "API key is required" },
        { status: 400 }
      );
    }

    let baseUrl: string;
    try {
      baseUrl = resolveBaseUrl(providerId, customEndpoint);
    } catch (err) {
      return NextResponse.json(
        { success: false, error: err instanceof Error ? err.message : "Invalid endpoint" },
        { status: 400 }
      );
    }

    try {
      const response = await fetch(`${baseUrl}/models`, {
        headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
        signal: AbortSignal.timeout(PROVIDER_FETCH_TIMEOUT_MS),
        redirect: "error",
      });

      if (!response.ok) {
        const detail = (await response.text().catch(() => "")).slice(0, 200);
        const hint =
          response.status === 401 || response.status === 403
            ? "Endpoint reachable, but it rejected the credentials (check the API key)."
            : `Endpoint responded with HTTP ${response.status}.`;
        return NextResponse.json(
          { success: false, error: detail ? `${hint} ${detail}` : hint },
          { status: 200 } // the test itself succeeded; the result is just negative
        );
      }

      const data = await response.json().catch(() => null);
      const rawModels = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.models)
        ? data.models
        : null;

      if (!rawModels) {
        return NextResponse.json({
          success: false,
          error:
            "Connected, but the response is not an OpenAI-compatible model list (no `data` array).",
        });
      }

      const modelCount = rawModels.length;
      return NextResponse.json({
        success: true,
        message: `Connected. Found ${modelCount} model${modelCount === 1 ? "" : "s"}.`,
        modelCount,
      });
    } catch (error) {
      if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
        return NextResponse.json({
          success: false,
          error: `Connection timed out after ${PROVIDER_FETCH_TIMEOUT_MS / 1000}s. Is the endpoint reachable from the server?`,
        });
      }
      return NextResponse.json({
        success: false,
        error: `Could not reach the endpoint: ${
          error instanceof Error ? error.message : "unknown error"
        }`,
      });
    }
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request payload" },
      { status: 400 }
    );
  }
}
