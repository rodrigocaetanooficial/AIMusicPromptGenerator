import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

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
        apiKey: cfg.apiKey,
        enabled: cfg.enabled,
        disabledModels: JSON.parse(cfg.disabledModels || "[]"),
        fetchedModels: JSON.parse(cfg.fetchedModels || "[]"),
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

    // Upsert UserProviderConfig items
    if (providerConfigs && typeof providerConfigs === "object") {
      for (const [pId, cfg] of Object.entries<any>(providerConfigs)) {
        await prisma.userProviderConfig.upsert({
          where: {
            userId_providerId: {
              userId: user.id,
              providerId: pId,
            },
          },
          update: {
            apiKey: cfg.apiKey || "",
            enabled: cfg.enabled ?? true,
            disabledModels: JSON.stringify(cfg.disabledModels || []),
            fetchedModels: JSON.stringify(cfg.fetchedModels || []),
          },
          create: {
            userId: user.id,
            providerId: pId,
            apiKey: cfg.apiKey || "",
            enabled: cfg.enabled ?? true,
            disabledModels: JSON.stringify(cfg.disabledModels || []),
            fetchedModels: JSON.stringify(cfg.fetchedModels || []),
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
