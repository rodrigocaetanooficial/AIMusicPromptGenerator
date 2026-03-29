import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const modelsSchema = z.object({
  provider: z.string().min(1),
  apiKey: z.string().min(1, "API key is required"),
});

interface GroqModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

interface GroqModelsResponse {
  data: GroqModel[];
}

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

    const { provider, apiKey } = result.data;

    if (provider === "groq") {
      try {
        const response = await fetch("https://api.groq.com/openai/v1/models", {
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

        const data: GroqModelsResponse = await response.json();

        // Filter and format models
        const models = data.data
          .filter((model) => model.id.includes("-")) // Filter out non-chat models if needed
          .map((model) => ({
            id: model.id,
            name: formatModelName(model.id),
            description: `Owned by: ${model.owned_by}`,
          }))
          .sort((a, b) => a.name.localeCompare(b.name));

        return NextResponse.json({ models });
      } catch (error) {
        console.error("Error fetching Groq models:", error);
        return NextResponse.json(
          { models: [], error: "Failed to fetch models" },
          { status: 500 }
        );
      }
    }

    if (provider === "openrouter") {
      try {
        const response = await fetch("https://openrouter.ai/api/v1/models", {
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        });

        if (!response.ok) {
          return NextResponse.json(
            { models: [], error: `API error: ${response.status}` },
            { status: response.status }
          );
        }

        const data = await response.json();

        const models = data.data
          .map((model: { id: string; name: string; description?: string }) => ({
            id: model.id,
            name: model.name || model.id,
            description: model.description,
          }))
          .sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name));

        return NextResponse.json({ models });
      } catch (error) {
        console.error("Error fetching OpenRouter models:", error);
        return NextResponse.json(
          { models: [], error: "Failed to fetch models" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { models: [], error: "Unknown provider" },
      { status: 400 }
    );
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
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
    .replace(/(\d+b)/gi, "$1")
    .replace(/(\d+k)/gi, "$1K");
}
