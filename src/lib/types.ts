// Provider configuration types
export interface Provider {
  id: string;
  name: string;
  baseUrl: string;
  keyUrl?: string; // Where to obtain an API key for this provider
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
    keyUrl: "https://openrouter.ai/settings/keys",
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    requiresApiKey: true,
    models: [],
    supportsModelListing: true,
  },
  {
    id: "opencode",
    keyUrl: "https://opencode.ai/zen",
    name: "OpenCode Zen",
    baseUrl: "https://opencode.ai/zen/v1",
    requiresApiKey: true,
    models: [],
    supportsModelListing: true,
  },
  {
    id: "opencode-go",
    keyUrl: "https://opencode.ai/zen",
    name: "OpenCode Go",
    baseUrl: "https://opencode.ai/zen/go/v1",
    requiresApiKey: true,
    models: [],
    supportsModelListing: true,
  },
  {
    id: "groq",
    keyUrl: "https://console.groq.com/keys",
    name: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    requiresApiKey: true,
    models: [],
    supportsModelListing: true,
  },
  {
    id: "openai",
    keyUrl: "https://platform.openai.com/api-keys",
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    requiresApiKey: true,
    models: [],
    supportsModelListing: true,
  },
  {
    id: "google",
    keyUrl: "https://aistudio.google.com/app/apikey",
    name: "Google AI (Gemini)",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    requiresApiKey: true,
    models: [],
    supportsModelListing: true,
  },
  {
    id: "deepseek",
    keyUrl: "https://platform.deepseek.com/api_keys",
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com",
    requiresApiKey: true,
    models: [],
    supportsModelListing: true,
  },
  {
    id: "nvidia",
    keyUrl: "https://build.nvidia.com/settings/api-keys",
    name: "NVIDIA NIM",
    baseUrl: "https://integrate.api.nvidia.com/v1",
    requiresApiKey: true,
    models: [],
    supportsModelListing: true,
  },
  {
    id: "xai",
    keyUrl: "https://console.x.ai",
    name: "xAI (Grok)",
    baseUrl: "https://api.x.ai/v1",
    requiresApiKey: true,
    models: [],
    supportsModelListing: true,
  },
  {
    id: "perplexity",
    keyUrl: "https://www.perplexity.ai/settings/api",
    name: "Perplexity",
    baseUrl: "https://api.perplexity.ai",
    requiresApiKey: true,
    models: [],
    supportsModelListing: true,
  },
  {
    id: "together",
    keyUrl: "https://api.together.xyz/settings/api-keys",
    name: "Together AI",
    baseUrl: "https://api.together.xyz/v1",
    requiresApiKey: true,
    models: [],
    supportsModelListing: true,
  },
  {
    id: "fireworks",
    keyUrl: "https://fireworks.ai/account/api-keys",
    name: "Fireworks AI",
    baseUrl: "https://api.fireworks.ai/inference/v1",
    requiresApiKey: true,
    models: [],
    supportsModelListing: true,
  },
  {
    id: "mistral",
    keyUrl: "https://console.mistral.ai/api-keys",
    name: "Mistral",
    baseUrl: "https://api.mistral.ai/v1",
    requiresApiKey: true,
    models: [],
    supportsModelListing: true,
  },
  {
    id: "cerebras",
    keyUrl: "https://cloud.cerebras.ai",
    name: "Cerebras",
    baseUrl: "https://api.cerebras.ai/v1",
    requiresApiKey: true,
    models: [],
    supportsModelListing: true,
  },
  {
    id: "deepinfra",
    keyUrl: "https://deepinfra.com/dash/api_keys",
    name: "DeepInfra",
    baseUrl: "https://api.deepinfra.com/v1/openai",
    requiresApiKey: true,
    models: [],
    supportsModelListing: true,
  },
  {
    id: "sambanova",
    keyUrl: "https://cloud.sambanova.ai/apis",
    name: "SambaNova",
    baseUrl: "https://api.sambanova.ai/v1",
    requiresApiKey: true,
    models: [],
    supportsModelListing: true,
  },
  {
    id: "siliconflow",
    keyUrl: "https://cloud.siliconflow.com/account/ak",
    name: "SiliconFlow",
    baseUrl: "https://api.siliconflow.com/v1",
    requiresApiKey: true,
    models: [],
    supportsModelListing: true,
  },
  {
    id: "moonshot",
    keyUrl: "https://platform.moonshot.ai/console/api-keys",
    name: "Moonshot (Kimi)",
    baseUrl: "https://api.moonshot.ai/v1",
    requiresApiKey: true,
    models: [],
    supportsModelListing: true,
  },
  {
    id: "qwen",
    keyUrl: "https://bailian.console.alibabacloud.com",
    name: "Alibaba DashScope (Qwen)",
    baseUrl: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
    requiresApiKey: true,
    models: [],
    supportsModelListing: true,
  },
  {
    id: "github",
    keyUrl: "https://github.com/settings/personal-access-tokens",
    name: "GitHub Models",
    baseUrl: "https://models.inference.ai.azure.com",
    requiresApiKey: true,
    models: [],
    supportsModelListing: true,
  },
  {
    id: "huggingface",
    keyUrl: "https://huggingface.co/settings/tokens",
    name: "Hugging Face",
    baseUrl: "https://router.huggingface.co/v1",
    requiresApiKey: true,
    models: [],
    supportsModelListing: true,
  },
  {
    id: "novita",
    keyUrl: "https://dash.novita.ai/key",
    name: "Novita AI",
    baseUrl: "https://api.novita.ai/v3/openai",
    requiresApiKey: true,
    models: [],
    supportsModelListing: true,
  },
  {
    id: "hyperbolic",
    keyUrl: "https://hyperbolic.xyz/settings",
    name: "Hyperbolic",
    baseUrl: "https://api.hyperbolic.xyz/v1",
    requiresApiKey: true,
    models: [],
    supportsModelListing: true,
  },
  {
    id: "nebius",
    keyUrl: "https://studio.nebius.ai/settings/api-keys",
    name: "Nebius",
    baseUrl: "https://api.studio.nebius.ai/v1",
    requiresApiKey: true,
    models: [],
    supportsModelListing: true,
  },
  {
    id: "zai",
    keyUrl: "https://z.ai/manage-apikey/apikey-list",
    name: "Z.AI (GLM)",
    baseUrl: "https://api.z.ai/api/paas/v4",
    requiresApiKey: true,
    models: [],
    supportsModelListing: true,
  },
  {
    id: "custom",
    name: "Custom / Local (Ollama)",
    baseUrl: "http://127.0.0.1:11434/v1",
    requiresApiKey: false,
    models: [],
    supportsModelListing: true,
  },
];

export interface ProviderConfig {
  apiKey: string;
  enabled: boolean;
  disabledModels: string[];
  fetchedModels?: Model[];
}

// Settings stored in localStorage
export interface Settings {
  provider: string;
  apiKey: string;
  model: string;
  theme: "light" | "dark" | "system";
  providerConfigs?: Record<string, ProviderConfig>;
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
