import { create } from "zustand";
import { persist } from "zustand/middleware";
import { providers, type Settings, type Model, type ProviderConfig } from "./types";

interface AppState extends Settings {
  providerConfigs: Record<string, ProviderConfig>;
  setProvider: (provider: string) => void;
  setApiKey: (apiKey: string) => void;
  setModel: (model: string) => void;
  setTheme: (theme: "light" | "dark" | "system") => void;
  setProviderApiKey: (providerId: string, apiKey: string) => void;
  setProviderEnabled: (providerId: string, enabled: boolean) => void;
  clearProviderKeys: () => void; // drop ALL locally-held keys/configs (server is source of truth)
  setFetchedModels: (providerId: string, models: Model[]) => void;
  toggleModelDisabled: (providerId: string, modelId: string, disabled: boolean) => void;
  getProviderConfig: (providerId: string) => ProviderConfig;
  getActiveProviderKey: (providerId: string) => string;
  getSelectedProvider: () => typeof providers[0] | undefined;
  getAllModels: (providerId: string) => Model[];
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      provider: "",
      apiKey: "",
      model: "",
      theme: "dark",
      providerConfigs: {},

      setProvider: (provider) => {
        const { providerConfigs } = get();
        const cfg = providerConfigs[provider];
        set({
          provider,
          apiKey: cfg?.apiKey || "",
        });
      },

      setApiKey: (apiKey) => {
        const { provider, providerConfigs } = get();
        const currentCfg = providerConfigs[provider] || {
          apiKey: "",
          enabled: true,
          disabledModels: [],
        };
        set({
          apiKey,
          providerConfigs: {
            ...providerConfigs,
            [provider]: {
              ...currentCfg,
              apiKey,
              enabled: true,
            },
          },
        });
      },

      setModel: (model) => set({ model }),

      setTheme: (theme) => set({ theme }),

      setProviderApiKey: (providerId, apiKey) => {
        const { providerConfigs, provider } = get();
        const currentCfg = providerConfigs[providerId] || {
          apiKey: "",
          enabled: true,
          disabledModels: [],
        };
        const nextConfigs = {
          ...providerConfigs,
          [providerId]: {
            ...currentCfg,
            apiKey,
            enabled: currentCfg.enabled ?? true,
          },
        };
        const updates: Partial<AppState> = { providerConfigs: nextConfigs };
        if (providerId === provider) {
          updates.apiKey = apiKey;
        }
        set(updates);
      },

      setProviderEnabled: (providerId, enabled) => {
        const { providerConfigs } = get();
        const currentCfg = providerConfigs[providerId] || {
          apiKey: "",
          enabled: true,
          disabledModels: [],
        };
        set({
          providerConfigs: {
            ...providerConfigs,
            [providerId]: {
              ...currentCfg,
              enabled,
            },
          },
        });
      },

      clearProviderKeys: () => {
        set({ providerConfigs: {}, apiKey: "" });
      },

      setFetchedModels: (providerId, models) => {
        const { providerConfigs } = get();
        const currentCfg = providerConfigs[providerId] || {
          apiKey: "",
          enabled: true,
          disabledModels: [],
        };
        set({
          providerConfigs: {
            ...providerConfigs,
            [providerId]: {
              ...currentCfg,
              fetchedModels: models,
            },
          },
        });
      },

      toggleModelDisabled: (providerId, modelId, disabled) => {
        const { providerConfigs } = get();
        const currentCfg = providerConfigs[providerId] || {
          apiKey: "",
          enabled: true,
          disabledModels: [],
        };
        const currentDisabled = currentCfg.disabledModels || [];
        const nextDisabled = disabled
          ? Array.from(new Set([...currentDisabled, modelId]))
          : currentDisabled.filter((id) => id !== modelId);

        set({
          providerConfigs: {
            ...providerConfigs,
            [providerId]: {
              ...currentCfg,
              disabledModels: nextDisabled,
            },
          },
        });
      },

      getProviderConfig: (providerId) => {
        const { providerConfigs, apiKey, provider } = get();
        const cfg = providerConfigs[providerId];
        if (cfg) return cfg;
        return {
          apiKey: providerId === provider ? apiKey : "",
          enabled: providerId === provider,
          disabledModels: [],
        };
      },

      getActiveProviderKey: (providerId) => {
        const { providerConfigs, apiKey, provider } = get();
        if (providerConfigs[providerId]?.apiKey) {
          return providerConfigs[providerId].apiKey;
        }
        return providerId === provider ? apiKey : "";
      },

      getSelectedProvider: () => {
        const { provider } = get();
        return providers.find((p) => p.id === provider);
      },

      getAllModels: (providerId) => {
        const { providerConfigs } = get();
        const cfg = providerConfigs[providerId];
        if (cfg?.fetchedModels && cfg.fetchedModels.length > 0) {
          return cfg.fetchedModels;
        }
        const providerObj = providers.find((p) => p.id === providerId);
        return providerObj?.models || [];
      },
    }),
    {
      name: "music-prompt-generator-settings",
      partialize: (state) => ({
        provider: state.provider,
        apiKey: state.apiKey,
        model: state.model,
        theme: state.theme,
        providerConfigs: state.providerConfigs,
      }),
    }
  )
);
