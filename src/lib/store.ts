import { create } from "zustand";
import { persist } from "zustand/middleware";
import { providers, type Settings, type Model } from "./types";

interface AppState extends Settings {
  setProvider: (provider: string) => void;
  setApiKey: (apiKey: string) => void;
  setModel: (model: string) => void;
  setTheme: (theme: "light" | "dark" | "system") => void;
  addCustomModel: (providerId: string, model: Model) => void;
  removeCustomModel: (providerId: string, modelId: string) => void;
  getSelectedProvider: () => typeof providers[0] | undefined;
  getSelectedModel: () => Model | undefined;
  getAllModels: (providerId: string) => Model[];
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      provider: "openrouter",
      apiKey: "",
      model: "anthropic/claude-3.5-sonnet",
      theme: "dark",
      customModels: {},

      setProvider: (provider) => {
        const allModels = get().getAllModels(provider);
        const defaultModel = allModels[0]?.id || "";
        set({ provider, model: defaultModel });
      },

      setApiKey: (apiKey) => set({ apiKey }),

      setModel: (model) => set({ model }),

      setTheme: (theme) => set({ theme }),

      addCustomModel: (providerId, model) => {
        const { customModels } = get();
        const existing = customModels[providerId] || [];
        if (existing.some((m) => m.id === model.id)) {
          return; // Model already exists
        }
        set({
          customModels: {
            ...customModels,
            [providerId]: [...existing, { ...model, isCustom: true }],
          },
        });
      },

      removeCustomModel: (providerId, modelId) => {
        const { customModels, model, provider } = get();
        const existing = customModels[providerId] || [];
        const filtered = existing.filter((m) => m.id !== modelId);
        set({
          customModels: {
            ...customModels,
            [providerId]: filtered,
          },
        });
        // If the removed model was selected, reset to default
        if (provider === providerId && model === modelId) {
          const allModels = get().getAllModels(providerId);
          set({ model: allModels[0]?.id || "" });
        }
      },

      getSelectedProvider: () => {
        const { provider } = get();
        return providers.find((p) => p.id === provider);
      },

      getSelectedModel: () => {
        const { provider, model } = get();
        const allModels = get().getAllModels(provider);
        return allModels.find((m) => m.id === model);
      },

      getAllModels: (providerId) => {
        const { customModels } = get();
        const provider = providers.find((p) => p.id === providerId);
        const custom = customModels[providerId] || [];
        return [...(provider?.models || []), ...custom];
      },
    }),
    {
      name: "music-prompt-generator-settings",
      partialize: (state) => ({
        provider: state.provider,
        apiKey: state.apiKey,
        model: state.model,
        theme: state.theme,
        customModels: state.customModels,
      }),
    }
  )
);
