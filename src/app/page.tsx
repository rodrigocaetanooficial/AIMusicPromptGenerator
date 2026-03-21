"use client";

import { useState, useEffect, useCallback } from "react";
import { useTheme } from "next-themes";
import { Settings, Copy, Check, Sparkles, Loader2, Music, Moon, Sun, Plus, X, RefreshCw } from "lucide-react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
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
    customModels,
    setProvider,
    setApiKey,
    setModel,
    addCustomModel,
    removeCustomModel,
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
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [fetchedModels, setFetchedModels] = useState<Model[]>([]);
  const [newModelId, setNewModelId] = useState("");
  const [newModelName, setNewModelName] = useState("");

  // Ensure hydration matches
  useEffect(() => {
    setMounted(true);
  }, []);

  // Get selected provider info
  const selectedProvider = providers.find((p) => p.id === provider);
  const allModels = getAllModels(provider);

  // Fetch models from API
  const fetchModels = useCallback(async () => {
    if (!selectedProvider?.supportsModelListing || !apiKey) {
      return;
    }

    setIsLoadingModels(true);
    try {
      const response = await fetch(
        `/api/models?provider=${provider}&apiKey=${encodeURIComponent(apiKey)}`
      );
      const data = await response.json();

      if (data.error) {
        toast({
          title: "Failed to fetch models",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      setFetchedModels(data.models);
      toast({
        title: "Models loaded",
        description: `Found ${data.models.length} models`,
      });
    } catch (error) {
      toast({
        title: "Failed to fetch models",
        description: "Could not load models from API",
        variant: "destructive",
      });
    } finally {
      setIsLoadingModels(false);
    }
  }, [provider, apiKey, selectedProvider, toast]);

  // Combine default, custom, and fetched models
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

  const handleAddCustomModel = () => {
    if (!newModelId.trim()) {
      toast({
        title: "Model ID required",
        description: "Please enter a model ID",
        variant: "destructive",
      });
      return;
    }

    addCustomModel(provider, {
      id: newModelId.trim(),
      name: newModelName.trim() || newModelId.trim(),
      isCustom: true,
    });

    toast({
      title: "Model added",
      description: `${newModelId} added to ${selectedProvider?.name}`,
    });

    setNewModelId("");
    setNewModelName("");
  };

  const handleRemoveCustomModel = (modelId: string) => {
    removeCustomModel(provider, modelId);
    toast({
      title: "Model removed",
      description: `${modelId} removed from ${selectedProvider?.name}`,
    });
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

                {/* Provider Selection */}
                <div className="space-y-2">
                  <Label>Provider</Label>
                  <Select value={provider} onValueChange={setProvider}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {providers.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    onClick={fetchModels}
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

                {/* Model Selection */}
                <div className="space-y-2">
                  <Label>Model</Label>
                  <Select value={model} onValueChange={setModel}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      {displayModels.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          <div className="flex items-center gap-2">
                            <span>{m.name}</span>
                            {m.isCustom && (
                              <Badge variant="secondary" className="text-xs">
                                Custom
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Custom Models Section */}
                {selectedProvider?.requiresApiKey && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <Label className="text-base">Custom Models</Label>
                      <p className="text-xs text-muted-foreground">
                        Add custom models not listed above (e.g., preview models)
                      </p>

                      {/* Existing custom models */}
                      {(customModels[provider] || []).length > 0 && (
                        <div className="space-y-2">
                          {customModels[provider].map((m) => (
                            <div
                              key={m.id}
                              className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                            >
                              <div>
                                <p className="text-sm font-medium">{m.name}</p>
                                <p className="text-xs text-muted-foreground">{m.id}</p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveCustomModel(m.id)}
                                className="h-8 w-8"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add new model */}
                      <div className="grid gap-2">
                        <Input
                          placeholder="Model ID (e.g., moonshotai/kimi-k2-instruct-0905)"
                          value={newModelId}
                          onChange={(e) => setNewModelId(e.target.value)}
                        />
                        <Input
                          placeholder="Display name (optional)"
                          value={newModelName}
                          onChange={(e) => setNewModelName(e.target.value)}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleAddCustomModel}
                          disabled={!newModelId.trim()}
                        >
                          <Plus className="w-4 h-4" />
                          Add Custom Model
                        </Button>
                      </div>
                    </div>
                  </>
                )}
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
          disabled={isGenerating || input.trim().length < 3}
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
