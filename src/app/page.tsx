"use client";

import { useState, useEffect, useCallback } from "react";
import { useTheme } from "next-themes";
import { Settings, Copy, Check, Sparkles, Loader2, Music, Moon, Sun, RefreshCw, ChevronsUpDown } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { providers, type GeneratedPrompt, type Model } from "@/lib/types";
import { useAppStore } from "@/lib/store";

export default function Home() {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const {
    provider,
    apiKey,
    model,
    setProvider,
    setApiKey,
    setModel,
    getAllModels,
  } = useAppStore();

  const [input, setInput] = useState("");
  const [promptCount, setPromptCount] = useState(3);
  const [temperature, setTemperature] = useState(0.8);
  const [isGenerating, setIsGenerating] = useState(false);
  const [prompts, setPrompts] = useState<GeneratedPrompt[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [providerOpen, setProviderOpen] = useState(false);
  const [providerQuery, setProviderQuery] = useState("");
  const [modelOpen, setModelOpen] = useState(false);
  const [modelQuery, setModelQuery] = useState("");
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [fetchedModels, setFetchedModels] = useState<Model[]>([]);

  // Ensure hydration matches
  useEffect(() => {
    setMounted(true);
  }, []);

  // Get selected provider info
  const selectedProvider = providers.find((p) => p.id === provider);
  const allModels = getAllModels(provider);

  // Fetch models from API
  const fetchModels = useCallback(async (silent = false) => {
    if (!selectedProvider?.supportsModelListing || !apiKey) {
      return;
    }

    setIsLoadingModels(true);
    try {
      const response = await fetch(
        `/api/models`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ provider, apiKey }),
        }
      );
      const data = await response.json();

      if (data.error) {
        if (!silent) {
          toast({
            title: "Failed to fetch models",
            description: data.error,
            variant: "destructive",
          });
        }
        return;
      }

      setFetchedModels(data.models);
      
      // Auto-select first model if current model is empty or invalid
      if (!model || !data.models.find((m: Model) => m.id === model)) {
        if (data.models.length > 0) {
          setModel(data.models[0].id);
        }
      }

      if (!silent) {
        toast({
          title: "Models loaded",
          description: `Found ${data.models.length} models`,
        });
      }
    } catch (error) {
      if (!silent) {
        toast({
          title: "Failed to fetch models",
          description: "Could not load models from API",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoadingModels(false);
    }
  }, [provider, apiKey, selectedProvider, model, setModel, toast]);

  // Auto-fetch models when provider or API key changes
  useEffect(() => {
    if (apiKey && selectedProvider?.supportsModelListing) {
      fetchModels(true);
    }
  }, [provider, apiKey, selectedProvider, fetchModels]);

  // Combine default and fetched models
  const displayModels = [...allModels, ...fetchedModels.filter(
    (fm) => !allModels.some((am) => am.id === fm.id)
  )];

  const handleGenerate = useCallback(async () => {
    if (input.trim().length < 3) {
      toast({
        title: "Input too short",
        description: "Please enter at least 3 characters",
        variant: "destructive",
      });
      return;
    }

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
          apiKey: apiKey || undefined,
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
  }, [input, promptCount, temperature, provider, apiKey, model, toast]);

  const handleCopy = async (prompt: GeneratedPrompt, index: number) => {
    const text = `Rhythm\n${prompt.rhythm}\n\nStyle\n${prompt.style}\n\nDetails\n${prompt.details}`;
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    toast({
      title: "Copied!",
      description: "Prompt copied to clipboard",
    });
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      handleGenerate();
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Music className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-xl font-bold">Music Prompt Generator</h1>
          </div>

          <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <Settings className="w-5 h-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Settings — v2 (search)</DialogTitle>
                <DialogDescription>
                  Configure your AI provider and preferences
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 pt-4">
                {/* Theme Toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {theme === "dark" ? (
                      <Moon className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Sun className="w-4 h-4 text-muted-foreground" />
                    )}
                    <Label>Dark Mode</Label>
                  </div>
                  <Switch
                    checked={theme === "dark"}
                    onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                  />
                </div>

                <Separator />

                {/* Provider Selection (searchable) */}
                <div className="space-y-2">
                  <Label>Provider</Label>
                  <Popover
                    open={providerOpen}
                    onOpenChange={(open) => {
                      setProviderOpen(open);
                      if (!open) setProviderQuery("");
                    }}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={providerOpen}
                        className="w-full justify-between font-normal"
                      >
                        <span className="truncate">
                          {selectedProvider?.name || "Select provider"}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-[var(--radix-popover-trigger-width)] p-0"
                      align="start"
                    >
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder="Search providers..."
                          value={providerQuery}
                          onValueChange={setProviderQuery}
                        />
                        <CommandList className="max-h-72">
                          <CommandEmpty>No provider found.</CommandEmpty>
                          <CommandGroup>
                            {providers
                              .filter((p) => {
                                const q = providerQuery.trim().toLowerCase();
                                if (!q) return true;
                                return (
                                  p.name.toLowerCase().includes(q) ||
                                  p.id.toLowerCase().includes(q)
                                );
                              })
                              .map((p) => (
                                <CommandItem
                                  key={p.id}
                                  value={p.id}
                                  onSelect={() => {
                                    setProvider(p.id);
                                    setProviderOpen(false);
                                    setProviderQuery("");
                                  }}
                                >
                                  <Check
                                    className={`mr-2 h-4 w-4 ${
                                      provider === p.id ? "opacity-100" : "opacity-0"
                                    }`}
                                  />
                                  {p.name}
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* API Key */}
                {selectedProvider?.requiresApiKey && (
                  <div className="space-y-2">
                    <Label>API Key</Label>
                    <Input
                      type="password"
                      placeholder={`Enter your ${selectedProvider.name} API key`}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Your API key is stored locally and never sent to our servers.
                    </p>
                  </div>
                )}

                {/* Fetch Models Button */}
                {selectedProvider?.supportsModelListing && apiKey && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchModels(false)}
                    disabled={isLoadingModels}
                    className="w-full"
                  >
                    {isLoadingModels ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    Fetch Available Models
                  </Button>
                )}

                {/* Model Selection (searchable) */}
                <div className="space-y-2">
                  <Label>Model</Label>
                  <Popover
                    open={modelOpen}
                    onOpenChange={(open) => {
                      if (displayModels.length === 0) return;
                      setModelOpen(open);
                      if (!open) setModelQuery("");
                    }}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={modelOpen}
                        disabled={displayModels.length === 0}
                        className="w-full justify-between font-normal"
                      >
                        <span className="truncate">
                          {displayModels.length === 0
                            ? "Enter API key to load models"
                            : displayModels.find((m) => m.id === model)?.name ||
                              model ||
                              "Select model"}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-[var(--radix-popover-trigger-width)] p-0"
                      align="start"
                    >
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder="Search models..."
                          value={modelQuery}
                          onValueChange={setModelQuery}
                        />
                        <CommandList className="max-h-72">
                          <CommandEmpty>No model found.</CommandEmpty>
                          <CommandGroup>
                            {displayModels
                              .filter((m) => {
                                const q = modelQuery.trim().toLowerCase();
                                if (!q) return true;
                                return (
                                  m.name.toLowerCase().includes(q) ||
                                  m.id.toLowerCase().includes(q) ||
                                  (m.description || "").toLowerCase().includes(q)
                                );
                              })
                              .map((m) => (
                                <CommandItem
                                  key={m.id}
                                  value={m.id}
                                  onSelect={() => {
                                    setModel(m.id);
                                    setModelOpen(false);
                                    setModelQuery("");
                                  }}
                                >
                                  <Check
                                    className={`mr-2 h-4 w-4 ${
                                      model === m.id ? "opacity-100" : "opacity-0"
                                    }`}
                                  />
                                  <div className="flex min-w-0 flex-col">
                                    <span className="truncate">{m.name}</span>
                                    {m.id !== m.name && (
                                      <span className="truncate text-xs text-muted-foreground">
                                        {m.id}
                                      </span>
                                    )}
                                  </div>
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Input Section */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">
            Describe your music
          </label>
          <Textarea
            placeholder="soft rock, jangly guitars"
            className="min-h-[100px] text-base resize-none"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <p className="text-xs text-muted-foreground">
            Minimum 3 characters • Press Ctrl/Cmd + Enter to generate
          </p>
        </div>

        {/* Controls */}
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Number of Prompts</label>
              <span className="text-sm font-bold text-primary">{promptCount}</span>
            </div>
            <Slider
              value={[promptCount]}
              onValueChange={([value]) => setPromptCount(value)}
              min={1}
              max={10}
              step={1}
              className="py-2"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Creativity (Temperature)</label>
              <span className="text-sm font-bold text-primary">{temperature.toFixed(1)}</span>
            </div>
            <Slider
              value={[temperature]}
              onValueChange={([value]) => setTemperature(value)}
              min={0.1}
              max={1.5}
              step={0.1}
              className="py-2"
            />
          </div>
        </div>

        {/* Generate Button */}
        <Button
          className="w-full h-12 text-base font-semibold"
          onClick={handleGenerate}
          disabled={isGenerating || input.trim().length < 3 || !model}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5" />
              Generate Prompts
            </>
          )}
        </Button>

        {/* Generated Prompts */}
        {prompts.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">Generated Prompts</h2>
            <div className="space-y-4">
              {prompts.map((prompt, index) => (
                <Card key={index} className="relative overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-medium">
                        Prompt {index + 1}
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(prompt, index)}
                        className="h-8 gap-1"
                      >
                        {copiedIndex === index ? (
                          <>
                            <Check className="w-4 h-4 text-green-500" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-0">
                    <div>
                      <h4 className="text-sm font-semibold text-primary mb-1">Rhythm</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {prompt.rhythm}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-primary mb-1">Style</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {prompt.style}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-primary mb-1">Details</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {prompt.details}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-auto">
        <div className="max-w-4xl mx-auto px-4 py-4 text-center text-sm text-muted-foreground">
          Music Prompt Generator • Create detailed prompts for AI music generators
        </div>
      </footer>
    </div>
  );
}
