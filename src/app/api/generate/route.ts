import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { providers } from "@/lib/types";

const generationSchema = z.object({
  input: z.string().min(3, "Input must be at least 3 characters").max(2000, "Input is too long"),
  count: z.number().int().min(1).max(10),
  temperature: z.number().min(0).max(2),
  provider: z.string().min(1),
  apiKey: z.string().optional(),
  model: z.string().min(1),
});

interface GenerateRequest {
  input: string;
  count: number;
  temperature: number;
  provider: string;
  apiKey?: string;
  model: string;
}

interface GeneratedPrompt {
  rhythm: string;
  style: string;
  details: string;
}

const SYSTEM_PROMPT = `You are an expert music prompt engineer specializing in creating detailed, production-ready prompts for AI music generators like Suno, Udio, and similar platforms.

Your task is to transform simple music descriptions into rich, detailed prompts.
Each prompt MUST contain three distinct fields:
1. "rhythm": BPM, time signature, drum patterns, percussion elements, groove description
2. "style": Genre, subgenre, era, mood, atmosphere (NO artist/band names)
3. "details": Instruments (specific tones and playing techniques), production characteristics, arrangement elements, vocal style if applicable, mixing approach

CRITICAL RULES:
- NEVER mention artist names, band names, singers, producers, or any specific person
- NEVER say "sounds like [artist]" or "in the style of [artist]" or "reminiscent of [artist]"
- NEVER reference songs by name
- Focus on sonic characteristics, exact BPM ranges, instrument tones, and production techniques

RESPONSE FORMAT:
You MUST respond with ONLY a valid JSON array containing objects with keys "rhythm", "style", and "details". Do NOT wrap in markdown explanation text outside the JSON array.
Example:
[
  {
    "rhythm": "120 BPM, 4/4 time signature, driving acoustic drums...",
    "style": "Synthwave, 80s Retro, energetic and mysterious...",
    "details": "Pulsing analog bassline, Prophet-5 synth leads with chorus..."
  }
]`;

function buildUserPrompt(input: string, count: number): string {
  return `Generate exactly ${count} unique, detailed music prompt object${count > 1 ? 's' : ''} based on this description: "${input}"

Respond ONLY with a JSON array containing ${count} items. Each item must have keys "rhythm", "style", and "details".
${count > 1 ? `Ensure all ${count} prompts are distinctly different variations exploring different sonic angles.` : ''}`;
}

function parsePromptSections(text: string): GeneratedPrompt {
  const sections: GeneratedPrompt = {
    rhythm: "",
    style: "",
    details: "",
  };

  // Flexible regex for rhythm
  const rhythmMatch = text.match(/(?:#+\s*|\*\*|^|\n)\s*(?:Rhythm|Ritmo)\s*[:*]*\s*([\s\S]*?)(?=(?:#+\s*|\*\*|^|\n)\s*(?:Style|Estilo|Details|Detalhes)|$)/i);
  // Flexible regex for style
  const styleMatch = text.match(/(?:#+\s*|\*\*|^|\n)\s*(?:Style|Estilo)\s*[:*]*\s*([\s\S]*?)(?=(?:#+\s*|\*\*|^|\n)\s*(?:Details|Detalhes|Rhythm|Ritmo)|$)/i);
  // Flexible regex for details
  const detailsMatch = text.match(/(?:#+\s*|\*\*|^|\n)\s*(?:Details|Detalhes)\s*[:*]*\s*([\s\S]*?)(?=(?:#+\s*|\*\*|^|\n)\s*(?:Rhythm|Ritmo|Style|Estilo|Prompt|\d+\.|---|===)|$)/i);

  if (rhythmMatch) sections.rhythm = rhythmMatch[1].replace(/^[:*\s]+/, '').trim();
  if (styleMatch) sections.style = styleMatch[1].replace(/^[:*\s]+/, '').trim();
  if (detailsMatch) sections.details = detailsMatch[1].replace(/^[:*\s]+/, '').trim();

  // If parsing failed, fallback to clean text
  if (!sections.rhythm && !sections.style && !sections.details) {
    sections.details = text.trim();
  }

  return sections;
}

function parseMultiplePrompts(text: string): GeneratedPrompt[] {
  let cleaned = text.trim();

  // Strip markdown code fences if present (e.g. ```json ... ```)
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  }

  // Tier 1: Try direct JSON parse
  try {
    const parsed = JSON.parse(cleaned);
    const items = Array.isArray(parsed) ? parsed : (parsed.prompts || parsed.data || [parsed]);
    if (Array.isArray(items) && items.length > 0) {
      return items.map((item: Record<string, unknown>) => ({
        rhythm: String(item.rhythm || item.Rhythm || item.groove || "").trim(),
        style: String(item.style || item.Style || item.genre || "").trim(),
        details: String(item.details || item.Details || item.instruments || "").trim(),
      })).filter(p => p.rhythm || p.style || p.details);
    }
  } catch {
    // Ignore JSON error and proceed to Tier 2
  }

  // Tier 2: Search for JSON array or object inside string using regex
  const jsonArrayMatch = cleaned.match(/\[\s*\{[\s\S]*\}\s*\]/);
  if (jsonArrayMatch) {
    try {
      const parsedArray = JSON.parse(jsonArrayMatch[0]);
      if (Array.isArray(parsedArray) && parsedArray.length > 0) {
        return parsedArray.map((item: Record<string, unknown>) => ({
          rhythm: String(item.rhythm || item.Rhythm || "").trim(),
          style: String(item.style || item.Style || "").trim(),
          details: String(item.details || item.Details || "").trim(),
        }));
      }
    } catch {
      // Proceed to Tier 3 fallback
    }
  }

  // Tier 3: Markdown / Text Splitter Fallback
  const promptPattern = /(?:^|\n)(?:(?:###?\s*)?(?:Prompt|Option|Variation)\s*\d+|---+|===+)\s*(?:\n|$)/i;
  const parts = cleaned.split(promptPattern).filter(part => part.trim().length > 10);

  if (parts.length > 1) {
    return parts.map(parsePromptSections);
  }

  // Try numbered pattern e.g. "1. ", "2. "
  const numberedPattern = /(?:^|\n)(?:\d+\.\s+)(?=\*\*|\#|Rhythm|Style)/i;
  const numberedParts = cleaned.split(numberedPattern).filter(part => part.trim().length > 10);

  if (numberedParts.length > 1) {
    return numberedParts.map(parsePromptSections);
  }

  return [parsePromptSections(cleaned)];
}



async function generateWithOpenAICompatible(
  input: string,
  count: number,
  temperature: number,
  provider: string,
  apiKey: string,
  model: string
): Promise<GeneratedPrompt[]> {
  const providerConfig = providers.find(p => p.id === provider);
  
  if (!providerConfig) {
    throw new Error(`Unknown provider: ${provider}`);
  }

  const baseUrl = providerConfig.baseUrl;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${apiKey}`,
  };

  if (provider === "openrouter" || provider === "opencode" || provider === "opencode-go") {
    headers["HTTP-Referer"] = "https://ai-music.viaweb.pro";
    headers["X-Title"] = "AI Music Prompt Generator";
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(input, count) },
      ],
      temperature,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Provider API error (${provider} - ${model} - ${response.status}):`, errorText);
    try {
      const parsed = JSON.parse(errorText);
      const errorJson = Array.isArray(parsed) ? parsed[0] : parsed;

      if (errorJson?.error?.message) {
        errorMessage = errorJson.error.message;
      } else if (errorJson?.error) {
        errorMessage = typeof errorJson.error === 'string' ? errorJson.error : JSON.stringify(errorJson.error);
      } else if (errorJson?.message) {
        errorMessage = errorJson.message;
      }
    } catch {
      // Ignore JSON parse failure
    }

    if (response.status === 429 || errorMessage.toLowerCase().includes("quota") || errorMessage.toLowerCase().includes("rate limit")) {
      if (provider === "google") {
        errorMessage = `Google AI Free Tier quota reached for '${model}' (Limit: 20 requests). Please wait 1 minute or switch to another model (e.g. Gemini 2.5 Flash, Groq, or OpenRouter).`;
      } else {
        errorMessage = `Rate limit reached for model '${model}'. Please wait a moment or select another model in Settings.`;
      }
    } else if (response.status === 401) {
      errorMessage = `Invalid API key for ${providerConfig.name}. Please check your credentials in Settings.`;
    } else if (response.status === 403) {
      errorMessage = `Access forbidden for ${providerConfig.name}. Your API key may be invalid or restricted.`;
    } else if (response.status === 404) {
      errorMessage = `Model '${model}' not found for ${providerConfig.name}. Please select another model in Settings.`;
    }
    
    throw new Error(errorMessage);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";
  return parseMultiplePrompts(content);
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.json();
    const result = generationSchema.safeParse(rawBody);

    if (!result.success) {
      return NextResponse.json(
        { prompts: [], error: result.error.issues[0]?.message || "Invalid input parameters." },
        { status: 400 }
      );
    }

    const { input, count, temperature, provider, apiKey, model } = result.data;

    let prompts: GeneratedPrompt[];

    if (!apiKey) {
      return NextResponse.json(
        { prompts: [], error: "API Key is required for the selected provider." },
        { status: 400 }
      );
    }
    
    // Use external provider with API key
    prompts = await generateWithOpenAICompatible(input, count, temperature, provider, apiKey, model);

    // Ensure we have the right number of prompts
    while (prompts.length < count) {
      prompts.push({
        rhythm: "Generated rhythm pattern",
        style: "Generated style description",
        details: "Generated details",
      });
    }

    return NextResponse.json({ prompts: prompts.slice(0, count) });
  } catch (error) {
    console.error("Generation error:", error);
    return NextResponse.json(
      { prompts: [], error: error instanceof Error ? error.message : "Failed to generate prompts" },
      { status: 500 }
    );
  }
}
