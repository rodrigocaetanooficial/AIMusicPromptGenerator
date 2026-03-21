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
  isCustom?: boolean; // User-added model
}

// Default models for each provider
const OPENROUTER_MODELS: Model[] = [
  { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet" },
  { id: "anthropic/claude-3-opus", name: "Claude 3 Opus" },
  { id: "openai/gpt-4o", name: "GPT-4o" },
  { id: "openai/gpt-4o-mini", name: "GPT-4o Mini" },
  { id: "google/gemini-pro-1.5", name: "Gemini Pro 1.5" },
  { id: "meta-llama/llama-3.1-70b-instruct", name: "Llama 3.1 70B" },
  { id: "meta-llama/llama-3.1-8b-instruct", name: "Llama 3.1 8B" },
  { id: "mistralai/mistral-large", name: "Mistral Large" },
];

const GROQ_MODELS: Model[] = [
  { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B Versatile" },
  { id: "llama-3.1-70b-versatile", name: "Llama 3.1 70B Versatile" },
  { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B Instant" },
  { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B" },
  { id: "gemma2-9b-it", name: "Gemma 2 9B" },
  { id: "distil-whisper-large-v3-en", name: "Distil Whisper Large V3 EN" },
];

// Available AI providers
export const providers: Provider[] = [
  {
    id: "openrouter",
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    requiresApiKey: true,
    models: OPENROUTER_MODELS,
    supportsModelListing: false,
  },
  {
    id: "groq",
    name: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    requiresApiKey: true,
    models: GROQ_MODELS,
    supportsModelListing: true, // Groq supports /models endpoint
  },
];

// Settings stored in localStorage
export interface Settings {
  provider: string;
  apiKey: string;
  model: string;
  theme: "light" | "dark" | "system";
  customModels: Record<string, Model[]>; // Provider ID -> custom models
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
