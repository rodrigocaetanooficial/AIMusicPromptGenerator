import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { providers } from "@/lib/types";

const modelsSchema = z.object({
  provider: z.string().min(1),
  apiKey: z.string().min(1, "API key is required"),
});

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();
    const result = modelsSchema.safeParse(rawBody);

    if (!result.success) {
      return NextResponse.json(
        { models: [], error: result.error.errors[0].message || "Invalid input parameters." },
        { status: 400 }
      );
    }

    const { provider: providerId, apiKey } = result.data;
    
    const providerConfig = providers.find(p => p.id === providerId);
    if (!providerConfig) {
      return NextResponse.json(
        { models: [], error: "Unknown provider" },
        { status: 400 }
      );
    }

    try {
      const response = await fetch(`${providerConfig.baseUrl}/models`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        const error = await response.text();
        return NextResponse.json(
          { models: [], error: `API error: ${response.status}` },
          { status: response.status }
        );
      }

      const data = await response.json();
      
      const models = data.data
        .map((model: any) => ({
          id: model.id,
          name: model.name || formatModelName(model.id),
          description: model.description || `Owned by: ${model.owned_by || 'Unknown'}`,
        }))
        .sort((a: any, b: any) => a.name.localeCompare(b.name));

      return NextResponse.json({ models });
    } catch (error) {
      console.error(`Error fetching models for ${providerId}:`, error);
      return NextResponse.json(
        { models: [], error: "Failed to fetch models" },
        { status: 500 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { models: [], error: "Invalid request payload" },
      { status: 400 }
    );
  }
}

function formatModelName(modelId: string): string {
  // Convert model ID to a readable name
  return modelId
    .split(/[-/]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
    .replace(/(\d+b)/gi, "$1")
    .replace(/(\d+k)/gi, "$1K");
}
