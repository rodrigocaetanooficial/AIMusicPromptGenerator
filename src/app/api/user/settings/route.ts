import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/encryption";
import { validateCustomEndpoint } from "@/lib/validation";
import { providers } from "@/lib/types";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email.toLowerCase() },
      include: {
        providerConfigs: true,
        settings: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const configsMap: Record<string, any> = {};
    user.providerConfigs.forEach((cfg) => {
      configsMap[cfg.providerId] = {
        apiKey: decrypt(cfg.apiKey), // Decrypt for the authenticated user
        enabled: cfg.enabled,
        disabledModels: JSON.parse(cfg.disabledModels || "[]"),
        fetchedModels: JSON.parse(cfg.fetchedModels || "[]"),
        customName: cfg.customName || "",
        customEndpoint: cfg.customEndpoint || "",
      };
    });

    return NextResponse.json({
      settings: {
        provider: user.settings?.selectedProvider || "openrouter",
        model: user.settings?.selectedModel || "",
        theme: user.settings?.theme || "dark",
      },
      providerConfigs: configsMap,
    });
  } catch (error) {
    console.error("Error loading user settings:", error);
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { provider, model, theme, providerConfigs } = body;

    const user = await prisma.user.findUnique({
      where: { email: session.user.email.toLowerCase() },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Upsert UserSettings
    if (provider !== undefined || model !== undefined || theme !== undefined) {
      await prisma.userSettings.upsert({
        where: { userId: user.id },
        update: {
          ...(provider ? { selectedProvider: provider } : {}),
          ...(model !== undefined ? { selectedModel: model } : {}),
          ...(theme ? { theme } : {}),
        },
        create: {
          userId: user.id,
          selectedProvider: provider || "openrouter",
          selectedModel: model || "",
          theme: theme || "dark",
        },
      });
    }

    // Upsert UserProviderConfig items with AES-256-GCM encryption
    if (providerConfigs && typeof providerConfigs === "object") {
      const knownProviderIds = new Set(providers.map((p) => p.id));

      for (const [pId, cfg] of Object.entries<any>(providerConfigs)) {
        // Only accept provider ids the app actually knows about — stops the
        // table filling with arbitrary keys from a crafted payload.
        if (!knownProviderIds.has(pId)) continue;
        if (!cfg || typeof cfg !== "object") continue;

        // SSRF protection for the user-supplied custom endpoint
        if (pId === "custom" && cfg.customEndpoint) {
          const validation = validateCustomEndpoint(String(cfg.customEndpoint));
          if (!validation.valid) {
            return NextResponse.json({ error: validation.error }, { status: 400 });
          }
        }

        // Bound the free-text/array fields so a huge payload can't be stored
        const customName =
          typeof cfg.customName === "string" && cfg.customName.trim()
            ? cfg.customName.trim().slice(0, 80)
            : null;
        const customEndpoint =
          typeof cfg.customEndpoint === "string" && cfg.customEndpoint.trim()
            ? cfg.customEndpoint.trim().slice(0, 500)
            : null;
        const disabledModels = Array.isArray(cfg.disabledModels)
          ? cfg.disabledModels.filter((m: unknown) => typeof m === "string").slice(0, 2000)
          : [];
        const fetchedModels = Array.isArray(cfg.fetchedModels)
          ? cfg.fetchedModels.slice(0, 2000)
          : [];

        const encryptedKey = encrypt(typeof cfg.apiKey === "string" ? cfg.apiKey : "");
        await prisma.userProviderConfig.upsert({
          where: {
            userId_providerId: {
              userId: user.id,
              providerId: pId,
            },
          },
          update: {
            apiKey: encryptedKey,
            enabled: cfg.enabled ?? true,
            disabledModels: JSON.stringify(disabledModels),
            fetchedModels: JSON.stringify(fetchedModels),
            customName,
            customEndpoint,
          },
          create: {
            userId: user.id,
            providerId: pId,
            apiKey: encryptedKey,
            enabled: cfg.enabled ?? true,
            disabledModels: JSON.stringify(disabledModels),
            fetchedModels: JSON.stringify(fetchedModels),
            customName,
            customEndpoint,
          },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving user settings:", error);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
