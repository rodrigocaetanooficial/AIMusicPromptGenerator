"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useTheme } from "next-themes";
import {
  Settings,
  Copy,
  Check,
  Sparkles,
  Loader2,
  Music,
  Moon,
  Sun,
  RefreshCw,
  ChevronsUpDown,
  Zap,
  ChevronDown,
  ChevronUp,
  Search,
  Cpu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { providers, type GeneratedPrompt, type Model, type Provider } from "@/lib/types";
import { useAppStore } from "@/lib/store";

export default function Home() {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const {
    provider,
    apiKey,
    model,
    providerConfigs,
    setProvider,
    setApiKey,
    setModel,
    setProviderApiKey,
    setProviderEnabled,
    setFetchedModels,
    toggleModelDisabled,
    getProviderConfig,
    getActiveProviderKey,
    getAllModels,
  } = useAppStore();

  const [input, setInput] = useState("");
  const [promptCount, setPromptCount] = useState(3);
  const [temperature, setTemperature] = useState(0.8);
  const [isGenerating, setIsGenerating] = useState(false);
  const [prompts, setPrompts] = useState<GeneratedPrompt[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [groupedModelOpen, setGroupedModelOpen] = useState(false);
  const [groupedModelQuery, setGroupedModelQuery] = useState("");
  const [loadingProviderId, setLoadingProviderId] = useState<string | null>(null);
  const [providerSearch, setProviderSearch] = useState("");
  const [modelSearchByProvider, setModelSearchByProvider] = useState<Record<string, string>>({});
  const [expandedProvider, setExpandedProvider] = useState<string | null>(provider);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch models for a specific provider
  const fetchModelsForProvider = useCallback(
    async (targetProviderId: string, silent = false) => {
      const pObj = providers.find((p) => p.id === targetProviderId);
      const cfg = getProviderConfig(targetProviderId);
      const effectiveKey = cfg?.apiKey || (targetProviderId === provider ? apiKey : "");

      if (!pObj?.supportsModelListing || (pObj.requiresApiKey && !effectiveKey)) {
        return;
      }

      setLoadingProviderId(targetProviderId);
      try {
        const response = await fetch(`/api/models`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider: targetProviderId, apiKey: effectiveKey }),
        });
        const data = await response.json();

        if (data.error) {
          if (!silent) {
            toast({
              title: `Failed to fetch models for ${pObj.name}`,
              description: data.error,
              variant: "destructive",
            });
          }
          return;
        }

        setFetchedModels(targetProviderId, data.models);

        if (!silent) {
          toast({
            title: `Models loaded for ${pObj.name}`,
            description: `Found ${data.models.length} models`,
          });
        }
      } catch (error) {
        if (!silent) {
          toast({
            title: `Failed to fetch models for ${pObj.name}`,
            description: "Could not load models from API",
            variant: "destructive",
          });
        }
      } finally {
        setLoadingProviderId(null);
      }
    },
    [getProviderConfig, provider, apiKey, setFetchedModels, toast]
  );

  // Compute enabled providers and their enabled models
  const groupedEnabledModels = useMemo(() => {
    return providers
      .map((p) => {
        const cfg = getProviderConfig(p.id);
        const isEnabled = cfg.enabled ?? (p.id === provider || !!cfg.apiKey);
        if (!isEnabled) return null;

        const rawModels = cfg.fetchedModels && cfg.fetchedModels.length > 0 ? cfg.fetchedModels : (p.models || []);
        const disabledSet = new Set(cfg.disabledModels || []);
        const activeModels = rawModels.filter((m) => !disabledSet.has(m.id));

        if (activeModels.length === 0 && rawModels.length === 0) {
          return { provider: p, models: [{ id: `${p.id}-default`, name: `${p.name} Default Model` }] };
        }

        return { provider: p, models: activeModels };
      })
      .filter(Boolean) as { provider: Provider; models: Model[] }[];
  }, [getProviderConfig, provider, providerConfigs]);

  const selectedProvider = providers.find((p) => p.id === provider);

  const handleGenerate = useCallback(async () => {
    if (input.trim().length < 3) {
      toast({
        title: "Input too short",
        description: "Please enter at least 3 characters",
        variant: "destructive",
      });
      return;
    }

    const currentKey = getActiveProviderKey(provider);

    setIsGenerating(true);
    setPrompts([]);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: input.trim(),
          count: promptCount,
          temperature,
          provider,
          apiKey: currentKey || undefined,
          model,
        }),
      });

      const data = await response.json();

      if (data.error) {
        toast({
          title: "Generation failed",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      setPrompts(data.prompts);
    } catch (error) {
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  }, [input, promptCount, temperature, provider, getActiveProviderKey, model, toast]);

  const handleCopy = async (promptItem: GeneratedPrompt, index: number) => {
    const text = `Rhythm:\n${promptItem.rhythm}\n\nStyle:\n${promptItem.style}\n\nDetails:\n${promptItem.details}`;
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    toast({
      title: "Copied!",
      description: `Full Prompt ${index + 1} copied to clipboard`,
    });
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleCopySection = async (title: string, content: string, key: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedSection(key);
    toast({
      title: "Copied section!",
      description: `${title} copied to clipboard`,
    });
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      handleGenerate();
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400">
              <Music className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-100 tracking-tight">Music Prompt Generator</h1>
              <p className="text-xs text-slate-400 hidden sm:block">AI-Powered Music Prompts for Suno & Udio</p>
            </div>
          </div>

          <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200">
                <Settings className="w-4 h-4 text-sky-400" />
                <span className="hidden sm:inline">Settings & Models</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700 text-slate-100 p-6">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold flex items-center gap-2 text-sky-400">
                  <Cpu className="w-5 h-5" />
                  Provider & Model Manager
                </DialogTitle>
                <DialogDescription className="text-slate-400">
                  Configure API keys for multiple providers, activate providers, and toggle individual models ON/OFF.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 pt-2">
                {/* Theme Toggle */}
                <div className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-950/60">
                  <div className="flex items-center gap-3">
                    {theme === "dark" ? (
                      <Moon className="w-4 h-4 text-sky-400" />
                    ) : (
                      <Sun className="w-4 h-4 text-amber-400" />
                    )}
                    <Label className="font-semibold text-slate-200">Dark Theme Mode</Label>
                  </div>
                  <Switch
                    checked={theme === "dark"}
                    onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                  />
                </div>

                <Separator className="bg-slate-800" />

                {/* Provider Search Filter */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-bold text-slate-200 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-sky-400" />
                      Configure AI Providers ({providers.length})
                    </Label>
                  </div>

                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                    <Input
                      placeholder="Search providers (Google, OpenRouter, Groq, OpenAI...)"
                      value={providerSearch}
                      onChange={(e) => setProviderSearch(e.target.value)}
                      className="pl-9 bg-slate-950 border-slate-700 text-slate-100"
                    />
                  </div>
                </div>

                {/* Provider Cards List */}
                <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-1">
                  {providers
                    .filter((p) => {
                      const q = providerSearch.trim().toLowerCase();
                      if (!q) return true;
                      return p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q);
                    })
                    .map((p) => {
                      const cfg = getProviderConfig(p.id);
                      const isSelected = provider === p.id;
                      const isExpanded = expandedProvider === p.id;
                      const pModels = getAllModels(p.id);
                      const disabledSet = new Set(cfg.disabledModels || []);
                      const modelSearch = modelSearchByProvider[p.id] || "";

                      return (
                        <div
                          key={p.id}
                          className={`rounded-xl border transition-all duration-200 ${
                            isSelected
                              ? "border-sky-500/70 bg-sky-950/30 shadow-lg shadow-sky-500/10"
                              : cfg.enabled
                              ? "border-slate-700 bg-slate-800/60"
                              : "border-slate-800/80 bg-slate-950/40 opacity-80"
                          }`}
                        >
                          {/* Card Header */}
                          <div className="p-4 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setExpandedProvider(isExpanded ? null : p.id)}
                                className="p-1 h-7 w-7 text-slate-400 hover:text-slate-200"
                              >
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </Button>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-100">{p.name}</span>
                                  {isSelected && (
                                    <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/40 text-[10px]">
                                      Active Default
                                    </Badge>
                                  )}
                                  {cfg.apiKey && (
                                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-[10px]">
                                      Key Set
                                    </Badge>
                                  )}
                                </div>
                                <span className="text-xs text-slate-400 block font-mono">
                                  {pModels.length} models available
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="text-xs text-slate-400 hidden sm:inline">
                                {cfg.enabled ? "Enabled" : "Disabled"}
                              </span>
                              <Switch
                                checked={cfg.enabled}
                                onCheckedChange={(enabled) => {
                                  setProviderEnabled(p.id, enabled);
                                  if (enabled && !provider) setProvider(p.id);
                                }}
                              />
                            </div>
                          </div>

                          {/* Expanded Configuration Section */}
                          {isExpanded && (
                            <div className="p-4 border-t border-slate-800/80 bg-slate-950/60 space-y-4 rounded-b-xl">
                              {/* API Key Input */}
                              {p.requiresApiKey && (
                                <div className="space-y-2">
                                  <Label className="text-xs font-semibold text-slate-300">
                                    {p.name} API Key
                                  </Label>
                                  <div className="flex gap-2">
                                    <Input
                                      type="password"
                                      placeholder={`Enter ${p.name} API Key...`}
                                      value={cfg.apiKey || ""}
                                      onChange={(e) => setProviderApiKey(p.id, e.target.value)}
                                      className="bg-slate-900 border-slate-700 text-slate-100 text-sm"
                                    />
                                    {p.supportsModelListing && (
                                      <Button
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        disabled={loadingProviderId === p.id || !cfg.apiKey}
                                        onClick={() => fetchModelsForProvider(p.id, false)}
                                        className="shrink-0 gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200"
                                      >
                                        {loadingProviderId === p.id ? (
                                          <Loader2 className="w-4 h-4 animate-spin text-sky-400" />
                                        ) : (
                                          <RefreshCw className="w-4 h-4 text-sky-400" />
                                        )}
                                        Fetch Models
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Per-Model Toggle Switches */}
                              <div className="space-y-3 pt-2">
                                <div className="flex items-center justify-between">
                                  <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                    Models ({pModels.length}) - Toggle to Enable / Disable
                                  </Label>
                                </div>

                                <Input
                                  placeholder={`Filter ${p.name} models...`}
                                  value={modelSearch}
                                  onChange={(e) =>
                                    setModelSearchByProvider({ ...modelSearchByProvider, [p.id]: e.target.value })
                                  }
                                  className="h-8 bg-slate-900 border-slate-800 text-xs text-slate-200 placeholder:text-slate-500"
                                />

                                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                  {pModels
                                    .filter((m) => {
                                      const q = modelSearch.trim().toLowerCase();
                                      if (!q) return true;
                                      return (
                                        m.name.toLowerCase().includes(q) ||
                                        m.id.toLowerCase().includes(q)
                                      );
                                    })
                                    .map((m) => {
                                      const isModelDisabled = disabledSet.has(m.id);
                                      const isCurrentModel = provider === p.id && model === m.id;

                                      return (
                                        <div
                                          key={m.id}
                                          className={`flex items-center justify-between p-2.5 rounded-lg border text-xs transition-colors ${
                                            isCurrentModel
                                              ? "border-sky-500/60 bg-sky-950/40 text-slate-100"
                                              : isModelDisabled
                                              ? "border-slate-800 bg-slate-950/30 text-slate-500"
                                              : "border-slate-800/80 bg-slate-900/60 text-slate-200 hover:bg-slate-800/50"
                                          }`}
                                        >
                                          <div className="flex flex-col min-w-0 pr-2">
                                            <div className="flex items-center gap-1.5">
                                              <span className="font-semibold truncate">{m.name}</span>
                                              {isCurrentModel && (
                                                <Badge className="bg-sky-500/30 text-sky-300 text-[9px] px-1.5">
                                                  Selected
                                                </Badge>
                                              )}
                                            </div>
                                            {m.id !== m.name && (
                                              <span className="font-mono text-[10px] text-slate-500 truncate">
                                                {m.id}
                                              </span>
                                            )}
                                          </div>

                                          <div className="flex items-center gap-2">
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="sm"
                                              onClick={() => {
                                                setProvider(p.id);
                                                setModel(m.id);
                                                if (cfg.apiKey) setApiKey(cfg.apiKey);
                                                toast({
                                                  title: "Model Selected",
                                                  description: `${p.name} - ${m.name}`,
                                                });
                                              }}
                                              className="h-6 px-2 text-[10px] bg-slate-800 hover:bg-sky-600 hover:text-white"
                                            >
                                              Use
                                            </Button>

                                            <Switch
                                              checked={!isModelDisabled}
                                              onCheckedChange={(checked) => {
                                                toggleModelDisabled(p.id, m.id, !checked);
                                              }}
                                            />
                                          </div>
                                        </div>
                                      );
                                    })}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Active Provider & Model Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border border-sky-500/30 bg-sky-950/20 text-xs shadow-md shadow-sky-950/50">
          <div className="flex items-center gap-2.5 flex-wrap text-slate-200">
            <span className="font-bold text-sky-400 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-sky-400" />
              Active Provider:
            </span>
            <span className="px-2.5 py-0.5 rounded-md bg-sky-500/15 border border-sky-500/30 font-semibold text-slate-100">
              {selectedProvider?.name || provider}
            </span>
            <span className="text-slate-500">•</span>
            <span className="font-bold text-sky-400">Selected Model:</span>
            <span className="px-2.5 py-0.5 rounded-md bg-sky-500/15 border border-sky-500/30 font-semibold text-slate-100 max-w-[220px] truncate">
              {model || "Default Model"}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSettingsOpen(true)}
            className="h-7 text-xs gap-1.5 border-sky-500/40 hover:border-sky-400 hover:bg-sky-500/20 text-sky-300 bg-slate-900/80"
          >
            <Settings className="w-3.5 h-3.5" />
            Manage Providers & Models
          </Button>
        </div>

        {/* Input Section Card */}
        <Card className="border border-slate-700/80 bg-slate-900/90 shadow-2xl rounded-2xl p-6 space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Music className="w-5 h-5 text-sky-400" />
                Describe your music
              </label>
              <span className="text-xs text-slate-400 font-mono">
                Press Ctrl + Enter to generate
              </span>
            </div>
            <Textarea
              placeholder="e.g. 80s synthwave with analog warm synths, driving drum machine, nocturnal synth-pop mood"
              className="min-h-[110px] text-base resize-none bg-slate-950 border-slate-700 text-slate-100 focus:border-sky-400 focus:ring-sky-400/30"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>

          {/* Grouped Model Selector Directly Under Prompt Box */}
          <div className="space-y-2 pt-1 border-t border-slate-800/80">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5" />
                Select AI Model (Grouped by Enabled Provider):
              </Label>
              <span className="text-[11px] text-slate-400">
                {groupedEnabledModels.reduce((acc, g) => acc + g.models.length, 0)} models active
              </span>
            </div>

            <Popover open={groupedModelOpen} onOpenChange={setGroupedModelOpen}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  role="combobox"
                  aria-expanded={groupedModelOpen}
                  className="w-full justify-between font-normal bg-slate-950 border-slate-700 hover:bg-slate-900 text-slate-100 h-11"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Badge className="bg-sky-500/20 text-sky-300 border-sky-500/30 text-xs">
                      {selectedProvider?.name || provider}
                    </Badge>
                    <span className="truncate font-semibold text-slate-100">
                      {model || "Select a model..."}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-60 text-slate-400" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-slate-900 border-slate-700 shadow-2xl" align="start">
                <Command shouldFilter={false} className="bg-slate-900 text-slate-100">
                  <CommandInput
                    placeholder="Search model or provider..."
                    value={groupedModelQuery}
                    onValueChange={setGroupedModelQuery}
                    className="bg-slate-950 text-slate-100"
                  />
                  <CommandList className="max-h-80">
                    <CommandEmpty className="p-4 text-xs text-slate-400 text-center">
                      No matching models found. Enable more providers in Settings!
                    </CommandEmpty>
                    {groupedEnabledModels.map(({ provider: p, models: pModels }) => {
                      const q = groupedModelQuery.trim().toLowerCase();
                      const filtered = pModels.filter((m) => {
                        if (!q) return true;
                        return (
                          m.name.toLowerCase().includes(q) ||
                          m.id.toLowerCase().includes(q) ||
                          p.name.toLowerCase().includes(q)
                        );
                      });

                      if (filtered.length === 0) return null;

                      return (
                        <CommandGroup key={p.id} heading={p.name} className="text-sky-400 font-bold text-xs uppercase px-2 py-1.5">
                          {filtered.map((m) => {
                            const isSelected = provider === p.id && model === m.id;
                            const key = getActiveProviderKey(p.id);

                            return (
                              <CommandItem
                                key={`${p.id}-${m.id}`}
                                value={`${p.id}-${m.id}`}
                                onSelect={() => {
                                  setProvider(p.id);
                                  setModel(m.id);
                                  if (key) setApiKey(key);
                                  setGroupedModelOpen(false);
                                  setGroupedModelQuery("");
                                  toast({
                                    title: "Switched Active Model",
                                    description: `${p.name} → ${m.name}`,
                                  });
                                }}
                                className={`cursor-pointer text-slate-200 aria-selected:bg-slate-800 flex items-center justify-between p-2.5 rounded-lg border my-1 ${
                                  isSelected ? "border-sky-500/70 bg-sky-950/50" : "border-slate-800/60 bg-slate-950/40"
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <Check className={`h-4 w-4 text-sky-400 shrink-0 ${isSelected ? "opacity-100" : "opacity-0"}`} />
                                  <div className="flex flex-col min-w-0">
                                    <span className="font-semibold text-sm truncate text-slate-100">{m.name}</span>
                                    <span className="text-[11px] text-slate-400 font-mono truncate">
                                      {p.name} • {m.id}
                                    </span>
                                  </div>
                                </div>
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      );
                    })}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Quick Suggestions */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Quick Suggestions:
            </span>
            <div className="flex flex-wrap gap-2">
              {[
                {
                  label: "🎹 80s Synthwave",
                  prompt: "80s synthwave with pulsing analog bass, retro drum machine, and nostalgic synth leads",
                },
                {
                  label: "🎧 Lo-Fi Chill",
                  prompt: "chill lo-fi hip hop with vinyl crackle, mellow electric piano, and dusty boom-bap drums",
                },
                {
                  label: "🎻 Epic Orchestral",
                  prompt: "epic cinematic orchestral trailer music with booming brass, soaring violins, and massive percussion",
                },
                {
                  label: "🎸 Heavy Metal",
                  prompt: "aggressive heavy metal with fast double-bass drums, distorted rhythm guitar riffs, and screaming solos",
                },
                {
                  label: "🎷 Smooth Jazz",
                  prompt: "smooth jazz quartet with soulful saxophone solo, walking acoustic bass, and brushed drums",
                },
              ].map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setInput(item.prompt)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-700 bg-slate-800/60 hover:bg-sky-500/20 hover:border-sky-500/50 text-slate-200 transition-all duration-150"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sliders Grid */}
          <div className="grid gap-6 sm:grid-cols-2 pt-2 border-t border-slate-800/80">
            <div className="space-y-3 p-3.5 rounded-xl border border-slate-800 bg-slate-950/60">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-200">
                  Number of Prompts
                </label>
                <span className="px-2.5 py-0.5 rounded-md text-sm font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">
                  {promptCount}
                </span>
              </div>
              <Slider
                value={[promptCount]}
                onValueChange={([val]) => setPromptCount(val)}
                min={1}
                max={10}
                step={1}
                className="py-2"
              />
            </div>

            <div className="space-y-3 p-3.5 rounded-xl border border-slate-800 bg-slate-950/60">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-200">
                  Creativity (Temperature)
                </label>
                <span className="px-2.5 py-0.5 rounded-md text-sm font-bold bg-sky-500/20 text-sky-400 border border-sky-500/30">
                  {temperature.toFixed(1)}
                </span>
              </div>
              <Slider
                value={[temperature]}
                onValueChange={([val]) => setTemperature(val)}
                min={0.1}
                max={1.5}
                step={0.1}
                className="py-2"
              />
            </div>
          </div>

          {/* Generate Button */}
          <Button
            className="w-full h-13 text-base font-bold bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white shadow-lg shadow-sky-500/20 active:scale-[0.99] transition-all rounded-xl cursor-pointer"
            onClick={handleGenerate}
            disabled={isGenerating || input.trim().length < 3 || !selectedProvider}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating Prompts...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Generate {promptCount} {promptCount > 1 ? "Prompts" : "Prompt"}
              </>
            )}
          </Button>
        </Card>

        {/* Results Section */}
        {prompts.length > 0 && (
          <div className="space-y-6 pt-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-sky-400" />
                Generated Prompts ({prompts.length})
              </h2>
            </div>

            <div className="space-y-6">
              {prompts.map((promptItem, index) => (
                <Card
                  key={index}
                  className="relative overflow-hidden border border-slate-700 bg-slate-900 shadow-xl hover:border-sky-500/50 transition-all duration-200 rounded-2xl"
                >
                  <CardHeader className="pb-3 border-b border-slate-800 bg-slate-950/60 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-500/20 text-xs font-bold text-sky-400 border border-sky-500/30">
                          {index + 1}
                        </span>
                        <CardTitle className="text-base font-bold text-slate-100">
                          Prompt {index + 1}
                        </CardTitle>
                      </div>

                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleCopy(promptItem, index)}
                        className="h-8 gap-1.5 font-medium shadow-sm bg-slate-800 hover:bg-sky-600 text-slate-200 hover:text-white border border-slate-700"
                      >
                        {copiedIndex === index ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-400" />
                            Copied All
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            Copy All
                          </>
                        )}
                      </Button>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4 pt-4 p-5">
                    {/* Rhythm Box */}
                    <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          🥁 Rhythm
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopySection("Rhythm", promptItem.rhythm, `rhythm-${index}`)}
                          className="h-7 px-2.5 text-xs text-emerald-300 hover:text-emerald-200 hover:bg-emerald-500/20"
                        >
                          {copiedSection === `rhythm-${index}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </Button>
                      </div>
                      <p className="text-sm text-slate-200 font-medium leading-relaxed pl-1">
                        {promptItem.rhythm || "N/A"}
                      </p>
                    </div>

                    {/* Style Box */}
                    <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-950/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                          🎨 Style
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopySection("Style", promptItem.style, `style-${index}`)}
                          className="h-7 px-2.5 text-xs text-purple-300 hover:text-purple-200 hover:bg-purple-500/20"
                        >
                          {copiedSection === `style-${index}` ? (
                            <Check className="w-3.5 h-3.5 text-purple-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </Button>
                      </div>
                      <p className="text-sm text-slate-200 font-medium leading-relaxed pl-1">
                        {promptItem.style || "N/A"}
                      </p>
                    </div>

                    {/* Details Box */}
                    <div className="p-4 rounded-xl border border-sky-500/30 bg-sky-950/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-500/20 text-sky-300 border border-sky-500/40">
                          🎛️ Details
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopySection("Details", promptItem.details, `details-${index}`)}
                          className="h-7 px-2.5 text-xs text-sky-300 hover:text-sky-200 hover:bg-sky-500/20"
                        >
                          {copiedSection === `details-${index}` ? (
                            <Check className="w-3.5 h-3.5 text-sky-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </Button>
                      </div>
                      <p className="text-sm text-slate-200 font-medium leading-relaxed pl-1">
                        {promptItem.details || "N/A"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-800 bg-slate-950/80 mt-auto">
        <div className="max-w-4xl mx-auto px-4 py-4 text-center text-sm text-slate-400">
          Music Prompt Generator • Create detailed prompts for AI music generators
        </div>
      </footer>
    </div>
  );
}
