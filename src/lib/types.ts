// Provider configuration types
export interface Provider {
  id: string;
  name: string;
  baseUrl: string;
  requiresApiKey: boolean;
  models: Model[];
  supportsModelListing: boolean; // Can fetch models from API
}

export interface Model {
  id: string;
  name: string;
  description?: string;
}

// Available AI providers (OpenAI compatible)
export const providers: Provider[] = [
  {
    id: "openrouter",
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    requiresApiKey: true,
    models: [],
    supportsModelListing: true,
  },
  {
    id: "groq",
    name: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    requiresApiKey: true,
    models: [],
    supportsModelListing: true,
  },
  {
    id: "openai",
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    requiresApiKey: true,
    models: [],
    supportsModelListing: true,
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com",
    requiresApiKey: true,
    models: [],
    supportsModelListing: true,
  },
  {
    id: "nvidia",
    name: "NVIDIA NIM",
    baseUrl: "https://integrate.api.nvidia.com/v1",
    requiresApiKey: true,
    models: [],
    supportsModelListing: true,
  },
  {
    id: "xai",
    name: "X.AI (Grok)",
    baseUrl: "https://api.x.ai/v1",
    requiresApiKey: true,
    models: [],
    supportsModelListing: true,
  },
  {
    id: "perplexity",
    name: "Perplexity",
    baseUrl: "https://api.perplexity.ai",
    requiresApiKey: true,
    models: [],
    supportsModelListing: true,
  },
  {
    id: "together",
    name: "Together AI",
    baseUrl: "https://api.together.xyz/v1",
    requiresApiKey: true,
    models: [],
    supportsModelListing: true,
  },
  {
    id: "fireworks",
    name: "Fireworks AI",
    baseUrl: "https://api.fireworks.ai/inference/v1",
    requiresApiKey: true,
    models: [],
    supportsModelListing: true,
  },
  {
    id: "mistral",
    name: "Mistral",
    baseUrl: "https://api.mistral.ai/v1",
    requiresApiKey: true,
    models: [],
    supportsModelListing: true,
  },
  {
    id: "cerebras",
    name: "Cerebras",
    baseUrl: "https://api.cerebras.ai/v1",
    requiresApiKey: true,
    models: [],
    supportsModelListing: true,
  },
  {
    id: "deepinfra",
    name: "DeepInfra",
    baseUrl: "https://api.deepinfra.com/v1/openai",
    requiresApiKey: true,
    models: [],
    supportsModelListing: true,
  },
  {
    id: "sambanova",
    name: "SambaNova",
    baseUrl: "https://api.sambanova.ai/v1",
    requiresApiKey: true,
    models: [],
    supportsModelListing: true,
  },
];

// Settings stored in localStorage
export interface Settings {
  provider: string;
  apiKey: string;
  model: string;
  theme: "light" | "dark" | "system";
}

// Generated prompt structure
export interface GeneratedPrompt {
  rhythm: string;
  style: string;
  details: string;
}

// API request/response types
export interface GenerateRequest {
  input: string;
  count: number;
  temperature: number;
  provider: string;
  apiKey?: string;
  model: string;
}

export interface GenerateResponse {
  prompts: GeneratedPrompt[];
  error?: string;
}

// API models response
export interface ModelsResponse {
  models: Model[];
  error?: string;
}
