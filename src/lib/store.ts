import { create } from "zustand";
import { persist } from "zustand/middleware";
import { providers, type Settings, type Model } from "./types";

interface AppState extends Settings {
  setProvider: (provider: string) => void;
  setApiKey: (apiKey: string) => void;
  setModel: (model: string) => void;
  setTheme: (theme: "light" | "dark" | "system") => void;
  getSelectedProvider: () => typeof providers[0] | undefined;
  getAllModels: (providerId: string) => Model[];
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      provider: "openrouter",
      apiKey: "",
      model: "",
      theme: "dark",

      setProvider: (provider) => {
        set({ provider, model: "" });
      },

      setApiKey: (apiKey) => set({ apiKey }),

      setModel: (model) => set({ model }),

      setTheme: (theme) => set({ theme }),

      getSelectedProvider: () => {
        const { provider } = get();
        return providers.find((p) => p.id === provider);
      },

      getAllModels: (providerId) => {
        const provider = providers.find((p) => p.id === providerId);
        return provider?.models || [];
      },
    }),
    {
      name: "music-prompt-generator-settings",
      partialize: (state) => ({
        provider: state.provider,
        apiKey: state.apiKey,
        model: state.model,
        theme: state.theme,
      }),
    }
  )
);
