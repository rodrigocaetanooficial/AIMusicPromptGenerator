import { NextRequest, NextResponse } from "next/server";


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

Your task is to transform simple music descriptions into rich, detailed prompts that cover:
1. Rhythm - BPM, time signature, drum patterns, percussion elements, groove description
2. Style - Genre, subgenre, era, mood, atmosphere
3. Details - Instruments (specific tones and techniques), production characteristics, arrangement elements, vocal style if applicable, mixing approach

CRITICAL RULES:
- NEVER mention artist names, band names, singers, producers, or any specific person
- NEVER say "sounds like [artist]" or "in the style of [artist]" or "reminiscent of [artist]"
- NEVER reference songs by name
- Use only genre names, era descriptions, and technical music terms
- Focus on sonic characteristics, not cultural associations

Format each section with clear headings. Be specific about:
- Exact BPM ranges and rhythmic feels
- Instrument types, tones, and playing techniques (e.g., "jangly electric guitars with reverb and chorus", "pulsing bass with warm tube amp tone")
- Production techniques (e.g., "parallel compression on drums", "room mic blend", "vintage plate reverb on vocals")
- Arrangement elements (build-ups, bridges, dynamic shifts, transitions)
- Vocal characteristics and processing when applicable
- Mix characteristics (e.g., "warm, analog-style mix", "punchy modern production", "lo-fi aesthetic")

Always respond with exactly the requested number of unique prompts. Each prompt should be different and creative while staying true to the input description.`;

function buildUserPrompt(input: string, count: number): string {
  return `Create ${count} unique, detailed music prompt${count > 1 ? 's' : ''} based on this description: "${input}"

For each prompt, provide:
**Rhythm**
[Specific tempo, time signature, drum pattern, percussion elements, groove description]

**Style**
[Primary genre, subgenres, era/style period, mood/atmosphere - NO artist or band names]

**Details**
[Instruments with specific tones and playing techniques, production characteristics, arrangement structure, vocal style if applicable, mixing approach - Be detailed but DO NOT mention any artist names]

${count > 1 ? `Create ${count} distinctly different variations, each exploring different aspects or interpretations of the original description.` : ''}`;
}

function parsePromptSections(text: string): GeneratedPrompt {
  const sections: GeneratedPrompt = {
    rhythm: "",
    style: "",
    details: "",
  };

  // Extract sections using regex
  const rhythmMatch = text.match(/\*\*Rhythm\*\*\s*([\s\S]*?)(?=\*\*Style\*\*|\*\*STyle\*\*|$)/i);
  const styleMatch = text.match(/\*\*Style\*\*\s*([\s\S]*?)(?=\*\*Details\*\*|\*\*DETAILS\*\*|$)/i);
  const detailsMatch = text.match(/\*\*Details\*\*\s*([\s\S]*?)(?=\*\*Rhythm\*\*|\*\*Prompt|\*\*---|$)/i);

  if (rhythmMatch) sections.rhythm = rhythmMatch[1].trim();
  if (styleMatch) sections.style = styleMatch[1].trim();
  if (detailsMatch) sections.details = detailsMatch[1].trim();

  // If parsing failed, try to use the whole text as details
  if (!sections.rhythm && !sections.style && !sections.details) {
    sections.details = text.trim();
  }

  return sections;
}

function parseMultiplePrompts(text: string): GeneratedPrompt[] {
  // Split by "Prompt" followed by number or by clear separators
  const promptPattern = /(?:^|\n)(?:Prompt\s*\d+|---+)\s*\n/i;
  const parts = text.split(promptPattern).filter(part => part.trim());

  if (parts.length <= 1) {
    // Try another splitting pattern for numbered prompts
    const numberedPattern = /(?:^|\n)\d+\.\s*\n/i;
    const numberedParts = text.split(numberedPattern).filter(part => part.trim());

    if (numberedParts.length > 1) {
      return numberedParts.map(parsePromptSections);
    }

    // Single prompt
    return [parsePromptSections(text)];
  }

  return parts.map(parsePromptSections);
}



async function generateWithOpenAICompatible(
  input: string,
  count: number,
  temperature: number,
  provider: string,
  apiKey: string,
  model: string
): Promise<GeneratedPrompt[]> {
  const baseUrls: Record<string, string> = {
    openrouter: "https://openrouter.ai/api/v1",
    groq: "https://api.groq.com/openai/v1",
  };

  const baseUrl = baseUrls[provider];
  if (!baseUrl) {
    throw new Error(`Unknown provider: ${provider}`);
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${apiKey}`,
  };

  if (provider === "openrouter") {
    headers["HTTP-Referer"] = "https://music-prompt-generator.local";
    headers["X-Title"] = "Music Prompt Generator";
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
    let errorMessage = `API error: ${response.status}`;
    
    try {
      const errorJson = JSON.parse(errorText);
      if (errorJson.error?.message) {
        errorMessage = errorJson.error.message;
      } else if (errorJson.message) {
        errorMessage = errorJson.message;
      }
    } catch {
      if (errorText.includes('Forbidden') || response.status === 403) {
        errorMessage = 'Access forbidden. Your API key may be invalid, expired, or restricted. Please check your Groq dashboard.';
      } else if (response.status === 401) {
        errorMessage = 'Invalid API key. Please verify your credentials.';
      } else if (response.status === 429) {
        errorMessage = 'Rate limit exceeded. Please wait and try again.';
      }
    }
    
    throw new Error(errorMessage);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "";
  return parseMultiplePrompts(content);
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();
    const { input, count, temperature, provider, apiKey, model } = body;

    if (!input || input.trim().length < 3) {
      return NextResponse.json(
        { prompts: [], error: "Input must be at least 3 characters" },
        { status: 400 }
      );
    }

    if (count < 1 || count > 10) {
      return NextResponse.json(
        { prompts: [], error: "Count must be between 1 and 10" },
        { status: 400 }
      );
    }

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
