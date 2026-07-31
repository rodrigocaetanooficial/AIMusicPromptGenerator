"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import { useTheme } from "next-themes";
import { Settings, Copy, Check, Sparkles, Loader2, Music, Moon, Sun, RefreshCw, ChevronsUpDown, Disc, Palette, Sliders, Zap } from "lucide-react";
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
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
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
    const text = `Rhythm:\n${prompt.rhythm}\n\nStyle:\n${prompt.style}\n\nDetails:\n${prompt.details}`;
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
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
                <DialogTitle>Settings</DialogTitle>
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
        {/* Active Provider / Model Info Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-sky-500/20 bg-sky-950/20 dark:bg-sky-950/30 text-xs">
          <div className="flex items-center gap-2 text-foreground/90">
            <span className="font-semibold text-sky-400 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-sky-400" />
              Active Provider:
            </span>
            <span className="px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/20 font-medium">
              {selectedProvider?.name || provider}
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="font-semibold text-sky-400">Model:</span>
            <span className="px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/20 font-medium truncate max-w-[200px]">
              {model || "Not selected"}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSettingsOpen(true)}
            className="h-7 text-xs gap-1 border-sky-500/30 hover:border-sky-400 hover:bg-sky-500/20 text-sky-300"
          >
            <Settings className="w-3.5 h-3.5" />
            Change Provider / Key
          </Button>
        </div>

        {/* Input Section Container */}
        <Card className="border border-border/80 bg-card/90 shadow-xl rounded-2xl p-6 space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-base font-bold text-foreground flex items-center gap-2">
                <Music className="w-5 h-5 text-primary" />
                Describe your music
              </label>
              <span className="text-xs text-muted-foreground font-mono">
                Press Ctrl + Enter to generate
              </span>
            </div>
            <Textarea
              placeholder="e.g. 80s synthwave with analog warm synths, driving drum machine, nocturnal synth-pop mood"
              className="min-h-[110px] text-base resize-none bg-background dark:bg-slate-950/80 border-border focus:border-primary focus:ring-primary/30"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>

          {/* Quick Presets */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Quick Suggestions:
            </span>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "🎹 80s Synthwave", prompt: "80s synthwave with pulsing analog bass, retro drum machine, and nostalgic synth leads" },
                { label: "🎧 Lo-Fi Chill", prompt: "chill lo-fi hip hop with vinyl crackle, mellow electric piano, and dusty boom-bap drums" },
                { label: "🎻 Epic Orchestral", prompt: "epic cinematic orchestral trailer music with booming brass, soaring violins, and massive percussion" },
                { label: "🎸 Heavy Metal", prompt: "aggressive heavy metal with fast double-bass drums, distorted rhythm guitar riffs, and screaming solos" },
                { label: "🎷 Smooth Jazz", prompt: "smooth jazz quartet with soulful saxophone solo, walking acoustic bass, and brushed drums" }
              ].map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setInput(preset.prompt)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border/70 bg-secondary/40 hover:bg-primary/20 hover:border-primary/50 text-foreground transition-all duration-150"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Controls Grid */}
          <div className="grid gap-6 sm:grid-cols-2 pt-2 border-t border-border/60">
            <div className="space-y-3 p-3.5 rounded-xl border border-border/50 bg-muted/20">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-foreground">Number of Prompts</label>
                <span className="px-2.5 py-0.5 rounded-md text-sm font-bold bg-primary/20 text-primary border border-primary/30">
                  {promptCount}
                </span>
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

            <div className="space-y-3 p-3.5 rounded-xl border border-border/50 bg-muted/20">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-foreground">Creativity (Temperature)</label>
                <span className="px-2.5 py-0.5 rounded-md text-sm font-bold bg-primary/20 text-primary border border-primary/30">
                  {temperature.toFixed(1)}
                </span>
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
            className="w-full h-13 text-base font-bold bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white shadow-lg shadow-sky-500/20 active:scale-[0.99] transition-all rounded-xl cursor-pointer"
            onClick={handleGenerate}
            disabled={isGenerating || input.trim().length < 3 || !model}
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

        {/* Generated Prompts */}
        {prompts.length > 0 && (
          <div className="space-y-6 pt-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                Generated Prompts ({prompts.length})
              </h2>
            </div>
            <div className="space-y-6">
              {prompts.map((prompt, index) => (
                <Card key={index} className="relative overflow-hidden border border-border bg-card shadow-lg hover:border-primary/50 transition-all duration-200">
                  <CardHeader className="pb-3 border-b border-border/60 bg-muted/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                          {index + 1}
                        </span>
                        <CardTitle className="text-base font-bold text-foreground">
                          Prompt {index + 1}
                        </CardTitle>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleCopy(prompt, index)}
                        className="h-8 gap-1.5 font-medium shadow-sm hover:bg-primary hover:text-primary-foreground transition-all"
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
                  <CardContent className="space-y-4 pt-4">
                    {/* Rhythm Box */}
                    <div className="p-3.5 rounded-lg border border-emerald-500/25 bg-emerald-950/20 dark:bg-emerald-950/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          <Disc className="w-3.5 h-3.5" />
                          Rhythm
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopySection("Rhythm", prompt.rhythm, `rhythm-${index}`)}
                          className="h-6 px-2 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20"
                        >
                          {copiedSection === `rhythm-${index}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </Button>
                      </div>
                      <p className="text-sm text-foreground/90 font-medium leading-relaxed pl-1">
                        {prompt.rhythm || "N/A"}
                      </p>
                    </div>

                    {/* Style Box */}
                    <div className="p-3.5 rounded-lg border border-purple-500/25 bg-purple-950/20 dark:bg-purple-950/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-400 border border-purple-500/30">
                          <Palette className="w-3.5 h-3.5" />
                          Style
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopySection("Style", prompt.style, `style-${index}`)}
                          className="h-6 px-2 text-xs text-purple-400 hover:text-purple-300 hover:bg-purple-500/20"
                        >
                          {copiedSection === `style-${index}` ? <Check className="w-3 h-3 text-purple-400" /> : <Copy className="w-3 h-3" />}
                        </Button>
                      </div>
                      <p className="text-sm text-foreground/90 font-medium leading-relaxed pl-1">
                        {prompt.style || "N/A"}
                      </p>
                    </div>

                    {/* Details Box */}
                    <div className="p-3.5 rounded-lg border border-sky-500/25 bg-sky-950/20 dark:bg-sky-950/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/20 text-sky-400 border border-sky-500/30">
                          <Sliders className="w-3.5 h-3.5" />
                          Details
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopySection("Details", prompt.details, `details-${index}`)}
                          className="h-6 px-2 text-xs text-sky-400 hover:text-sky-300 hover:bg-sky-500/20"
                        >
                          {copiedSection === `details-${index}` ? <Check className="w-3 h-3 text-sky-400" /> : <Copy className="w-3 h-3" />}
                        </Button>
                      </div>
                      <p className="text-sm text-foreground/90 font-medium leading-relaxed pl-1">
                        {prompt.details || "N/A"}
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
