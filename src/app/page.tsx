"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useTheme } from "next-themes";
import { useSession, signIn, signOut } from "next-auth/react";
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
  Cpu,
  LogOut,
  UserPlus,
  LogIn,
  CheckCircle2,
  AlertCircle
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
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { toast } = useToast();
  const { data: session, status: sessionStatus } = useSession();
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

  // Auth Dialog state
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isHydratedRef = useState({ current: false })[0];
  const lastSyncedRef = useState({ current: "" })[0];

  // Sync user settings from database on login
  useEffect(() => {
    if (sessionStatus === "authenticated") {
      fetch("/api/user/settings")
        .then((res) => res.json())
        .then((data) => {
          if (data.settings) {
            if (data.settings.provider) setProvider(data.settings.provider);
            if (data.settings.model) setModel(data.settings.model);
            if (data.settings.theme) setTheme(data.settings.theme);
          }
          if (data.providerConfigs && typeof data.providerConfigs === "object") {
            for (const [pId, cfg] of Object.entries<any>(data.providerConfigs)) {
              if (cfg.apiKey) setProviderApiKey(pId, cfg.apiKey);
              if (cfg.enabled !== undefined) setProviderEnabled(pId, cfg.enabled);
              if (Array.isArray(cfg.fetchedModels)) setFetchedModels(pId, cfg.fetchedModels);
            }
          }
          isHydratedRef.current = true;
          lastSyncedRef.current = JSON.stringify({
            provider: data.settings?.provider || provider,
            model: data.settings?.model || model,
            theme: data.settings?.theme || theme,
            providerConfigs: data.providerConfigs || providerConfigs,
          });
        })
        .catch((err) => {
          console.error("Failed to load user settings:", err);
          isHydratedRef.current = true;
        });
    } else {
      isHydratedRef.current = true;
    }
  }, [sessionStatus]);

  // Auto-save user settings to database when authenticated, only if changed
  useEffect(() => {
    if (sessionStatus === "authenticated" && isHydratedRef.current) {
      const payloadStr = JSON.stringify({ provider, model, theme, providerConfigs });
      if (payloadStr === lastSyncedRef.current) return;

      const timer = setTimeout(() => {
        lastSyncedRef.current = payloadStr;
        fetch("/api/user/settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payloadStr,
        }).catch((err) => console.error("Failed to sync settings:", err));
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [sessionStatus, provider, model, theme, providerConfigs]);

  // Check URL parameters for email verification notice
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("verified") === "true") {
        toast({
          title: "Account Email Verified! 🎉",
          description: "Your email has been confirmed. You can now sign in.",
        });
        setAuthMode("login");
        setAuthOpen(true);
      } else if (urlParams.get("error")?.includes("Verification")) {
        toast({
          title: "Verification Failed",
          description: "Invalid or expired verification link. Please register again.",
          variant: "destructive",
        });
      }
    }
  }, [toast]);

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

      let data;
      try {
        data = await response.json();
      } catch {
        toast({
          title: "Generation failed",
          description: `Server returned error (${response.status}). Check your API key.`,
          variant: "destructive",
        });
        return;
      }

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

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthMessage(null);
    setAuthLoading(true);

    if (authMode === "register") {
      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: authName, email: authEmail, password: authPassword }),
        });
        const data = await res.json();

        if (!res.ok || data.error) {
          setAuthMessage({ type: "error", text: data.error || "Registration failed" });
        } else {
          setAuthMessage({
            type: "success",
            text: data.message || "Account created! Check your email to verify.",
          });
        }
      } catch (err) {
        setAuthMessage({ type: "error", text: "An unexpected error occurred." });
      } finally {
        setAuthLoading(false);
      }
    } else {
      try {
        const res = await signIn("credentials", {
          redirect: false,
          email: authEmail,
          password: authPassword,
        });

        if (res?.error) {
          if (res.error === "EMAIL_NOT_VERIFIED") {
            setAuthMessage({
              type: "error",
              text: "Your email has not been verified yet. Please check your inbox for the activation link.",
            });
          } else {
            setAuthMessage({ type: "error", text: "Invalid email or password." });
          }
        } else {
          setAuthOpen(false);
          toast({ title: "Welcome back!", description: "Successfully signed in." });
        }
      } catch (err) {
        setAuthMessage({ type: "error", text: "Failed to sign in." });
      } finally {
        setAuthLoading(false);
      }
    }
  };

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

  const isDark = mounted && (resolvedTheme === "dark" || theme === "dark");

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      {/* Header */}
      <header className="border-b border-border bg-card/95 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-sky-500/15 border border-sky-400/30 text-sky-500 shadow-sm">
              <Music className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground tracking-tight">Music Prompt Generator</h1>
              <p className="text-xs text-muted-foreground hidden sm:block">AI-Powered Music Prompts for Suno & Udio</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Quick Theme Switcher Button */}
            {mounted && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTheme(isDark ? "light" : "dark")}
                className="h-9 w-9 p-0 rounded-xl hover:bg-accent text-foreground"
                title={isDark ? "Switch to Light Theme" : "Switch to Dark Theme"}
              >
                {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
              </Button>
            )}

            {/* Settings Dialog Trigger */}
            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 border-border bg-card hover:bg-accent text-foreground text-xs font-semibold shadow-sm">
                  <Settings className="w-4 h-4 text-sky-500" />
                  <span className="hidden sm:inline">Settings</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border text-card-foreground p-6 shadow-2xl">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold flex items-center gap-2 text-sky-500">
                    <Cpu className="w-5 h-5" />
                    Provider & Model Manager
                  </DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    Configure API keys for multiple providers, activate providers, and toggle individual models ON/OFF.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 pt-2">
                  {/* Theme Switcher in Settings */}
                  <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-secondary/50 shadow-sm">
                    <div className="flex items-center gap-3">
                      {isDark ? (
                        <Moon className="w-4 h-4 text-sky-400" />
                      ) : (
                        <Sun className="w-4 h-4 text-amber-500" />
                      )}
                      <div>
                        <Label className="font-semibold text-foreground block">Dark Mode</Label>
                        <span className="text-xs text-muted-foreground">Toggle between Light and Dark themes</span>
                      </div>
                    </div>
                    <Switch
                      checked={isDark}
                      onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                    />
                  </div>

                  <Separator className="bg-border" />

                  {/* Provider Search Filter */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-bold text-foreground flex items-center gap-2">
                        <Zap className="w-4 h-4 text-sky-500" />
                        Configure AI Providers ({providers.length})
                      </Label>
                    </div>

                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                      <Input
                        placeholder="Search providers (Google, OpenRouter, Groq, OpenAI...)"
                        value={providerSearch}
                        onChange={(e) => setProviderSearch(e.target.value)}
                        className="pl-9 bg-input border-border text-foreground placeholder:text-muted-foreground font-medium"
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
                                ? "border-sky-500 dark:border-sky-400 bg-sky-500/10 shadow-md"
                                : cfg.enabled
                                ? "border-border bg-card"
                                : "border-border/60 bg-muted/40 opacity-80"
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
                                  className="p-1 h-7 w-7 text-muted-foreground hover:text-foreground"
                                >
                                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </Button>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-foreground">{p.name}</span>
                                    {isSelected && (
                                      <Badge className="bg-sky-500/20 text-sky-600 dark:text-sky-300 border-sky-500/40 text-[10px]">
                                        Active Default
                                      </Badge>
                                    )}
                                    {cfg.apiKey && (
                                      <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border-emerald-500/40 text-[10px]">
                                        Key Set
                                      </Badge>
                                    )}
                                  </div>
                                  <span className="text-xs text-muted-foreground block font-mono">
                                    {pModels.length} models available
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <span className="text-xs font-semibold text-muted-foreground hidden sm:inline">
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
                              <div className="p-4 border-t border-border bg-secondary/40 space-y-4 rounded-b-xl">
                                {/* API Key Input */}
                                {p.requiresApiKey && (
                                  <div className="space-y-2">
                                    <Label className="text-xs font-semibold text-foreground">
                                      {p.name} API Key
                                    </Label>
                                    <div className="flex gap-2">
                                      <Input
                                        type="password"
                                        placeholder={`Enter ${p.name} API Key...`}
                                        value={cfg.apiKey || ""}
                                        onChange={(e) => setProviderApiKey(p.id, e.target.value)}
                                        className="bg-input border-border text-foreground text-sm font-mono"
                                      />
                                      {p.supportsModelListing && (
                                        <Button
                                          type="button"
                                          variant="secondary"
                                          size="sm"
                                          disabled={loadingProviderId === p.id || !cfg.apiKey}
                                          onClick={() => fetchModelsForProvider(p.id, false)}
                                          className="shrink-0 gap-1.5 bg-secondary text-secondary-foreground border border-border"
                                        >
                                          {loadingProviderId === p.id ? (
                                            <Loader2 className="w-4 h-4 animate-spin text-sky-500" />
                                          ) : (
                                            <RefreshCw className="w-4 h-4 text-sky-500" />
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
                                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                      Models ({pModels.length}) - Toggle to Enable / Disable
                                    </Label>
                                  </div>

                                  <Input
                                    placeholder={`Filter ${p.name} models...`}
                                    value={modelSearch}
                                    onChange={(e) =>
                                      setModelSearchByProvider({ ...modelSearchByProvider, [p.id]: e.target.value })
                                    }
                                    className="h-8 bg-input border-border text-xs text-foreground placeholder:text-muted-foreground"
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
                                                ? "border-sky-500 bg-sky-500/15 text-foreground"
                                                : isModelDisabled
                                                ? "border-border bg-muted/40 text-muted-foreground opacity-60"
                                                : "border-border bg-card text-foreground hover:bg-accent"
                                            }`}
                                          >
                                            <div className="flex flex-col min-w-0 pr-2">
                                              <div className="flex items-center gap-1.5">
                                                <span className="font-semibold truncate text-foreground">{m.name}</span>
                                                {isCurrentModel && (
                                                  <Badge className="bg-sky-500/30 text-sky-600 dark:text-sky-300 text-[9px] px-1.5">
                                                    Selected
                                                  </Badge>
                                                )}
                                              </div>
                                              {m.id !== m.name && (
                                                <span className="font-mono text-[10px] text-muted-foreground truncate">
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
                                                className="h-6 px-2 text-[10px] bg-secondary hover:bg-sky-600 hover:text-white border border-border"
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

            {/* User Profile / Login Button */}
            {sessionStatus === "authenticated" && session.user ? (
              <div className="flex items-center gap-2 bg-secondary border border-border rounded-xl p-1 pr-3 shadow-sm">
                {session.user.image ? (
                  <img src={session.user.image} alt="User" className="w-7 h-7 rounded-lg" />
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-500 font-bold text-xs flex items-center justify-center">
                    {session.user.name?.[0]?.toUpperCase() || "U"}
                  </div>
                )}
                <span className="text-xs font-semibold text-foreground hidden sm:inline max-w-[120px] truncate">
                  {session.user.name || session.user.email}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => signOut()}
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setAuthMessage(null);
                  setAuthOpen(true);
                }}
                className="gap-1.5 border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-300 hover:bg-sky-500 hover:text-white text-xs font-semibold shadow-sm"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In / Register</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* User Auth Modal (Sign In / Register / Google OAuth) */}
      <Dialog open={authOpen} onOpenChange={setAuthOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border text-card-foreground p-6 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-sky-500">
              {authMode === "login" ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
              {authMode === "login" ? "Sign In to Your Account" : "Create Your Account"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {authMode === "login"
                ? "Sign in to permanently save your API keys and active models."
                : "Create an account to keep your settings synced permanently across all devices."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Google OAuth Button */}
            <Button
              type="button"
              variant="outline"
              onClick={() => signIn("google")}
              className="w-full h-11 bg-secondary hover:bg-accent border-border text-foreground gap-2 font-semibold shadow-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"
                />
                <path
                  fill="#4285F4"
                  d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.6 14.8c-.3-.8-.4-1.7-.4-2.8s.1-2 .4-2.8L1.9 6.3C.7 8.7 0 10.3 0 12s.7 3.3 1.9 5.7l3.7-2.9z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"
                />
              </svg>
              Continue with Google
            </Button>

            <div className="relative flex items-center justify-center my-2">
              <Separator className="bg-border" />
              <span className="absolute bg-card px-3 text-xs text-muted-foreground font-semibold uppercase">Or</span>
            </div>

            {/* Auth Message Banner */}
            {authMessage && (
              <div
                className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
                  authMessage.type === "success"
                    ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-300"
                    : "bg-red-500/10 border-red-500/40 text-red-600 dark:text-red-300"
                }`}
              >
                {authMessage.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                )}
                <span>{authMessage.text}</span>
              </div>
            )}

            {/* Email / Password Form */}
            <form onSubmit={handleAuthSubmit} className="space-y-3">
              {authMode === "register" && (
                <div className="space-y-1">
                  <Label className="text-xs text-foreground">Name</Label>
                  <Input
                    placeholder="Your Name"
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    className="bg-input border-border text-foreground text-sm"
                  />
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs text-foreground">Email Address</Label>
                <Input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="bg-input border-border text-foreground text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-foreground">Password</Label>
                <Input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="bg-input border-border text-foreground text-sm"
                />
              </div>

              <Button
                type="submit"
                disabled={authLoading}
                className="w-full h-11 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl mt-2 shadow-md"
              >
                {authLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : authMode === "login" ? (
                  "Sign In"
                ) : (
                  "Create Account & Send Verification Email"
                )}
              </Button>
            </form>

            {/* Switch Mode Toggle */}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setAuthMessage(null);
                  setAuthMode(authMode === "login" ? "register" : "login");
                }}
                className="text-xs text-sky-500 hover:underline font-semibold"
              >
                {authMode === "login"
                  ? "Don't have an account? Register here"
                  : "Already have an account? Sign in"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Main Prompter Card */}
        <Card className="border border-border bg-card shadow-2xl rounded-2xl p-6 space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-base font-bold text-foreground flex items-center gap-2">
                <Music className="w-5 h-5 text-sky-500" />
                Describe your music
              </label>
              <span className="text-xs text-muted-foreground font-mono">
                Press Ctrl + Enter to generate
              </span>
            </div>
            <Textarea
              placeholder="e.g. 80s synthwave with analog warm synths, driving drum machine, nocturnal synth-pop mood"
              className="min-h-[110px] text-base resize-none bg-input border-border text-foreground focus:border-sky-500 focus:ring-sky-500/30 placeholder:text-muted-foreground font-sans shadow-inner"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>

          {/* AI Model Dropdown */}
          <div className="space-y-2 pt-1 border-t border-border">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-sky-500" />
                Select AI Model:
              </Label>
              <span className="text-xs text-muted-foreground font-medium">
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
                  className="w-full justify-between font-normal bg-input border-border hover:bg-accent text-foreground h-11 shadow-sm"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Badge className="bg-sky-500/20 text-sky-600 dark:text-sky-300 border-sky-500/30 text-xs font-bold">
                      {selectedProvider?.name || provider}
                    </Badge>
                    <span className="truncate font-semibold text-foreground">
                      {model || "Select a model..."}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-70 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-card border-border shadow-2xl" align="start">
                <Command shouldFilter={false} className="bg-card text-card-foreground">
                  <CommandInput
                    placeholder="Search model or provider..."
                    value={groupedModelQuery}
                    onValueChange={setGroupedModelQuery}
                    className="bg-input text-foreground border-border"
                  />
                  <CommandList className="max-h-80">
                    <CommandEmpty className="p-4 text-xs text-muted-foreground text-center">
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
                        <CommandGroup key={p.id} heading={p.name} className="text-sky-500 font-bold text-xs uppercase px-2 py-1.5">
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
                                className={`cursor-pointer text-foreground aria-selected:bg-accent flex items-center justify-between p-2.5 rounded-lg border my-1 ${
                                  isSelected ? "border-sky-500 bg-sky-500/20" : "border-border bg-input hover:bg-accent"
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <Check className={`h-4 w-4 text-sky-500 shrink-0 ${isSelected ? "opacity-100" : "opacity-0"}`} />
                                  <div className="flex flex-col min-w-0">
                                    <span className="font-semibold text-sm truncate text-foreground">{m.name}</span>
                                    <span className="text-[11px] text-muted-foreground font-mono truncate">
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
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
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
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-border bg-secondary hover:bg-sky-500 hover:text-white text-foreground transition-all duration-150 shadow-sm"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sliders Grid */}
          <div className="grid gap-6 sm:grid-cols-2 pt-2 border-t border-border">
            <div className="space-y-3 p-4 rounded-xl border border-border bg-secondary/50 shadow-sm">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-foreground">
                  Number of Prompts
                </label>
                <span className="px-2.5 py-0.5 rounded-md text-sm font-bold bg-sky-500/20 text-sky-600 dark:text-sky-300 border border-sky-500/30">
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

            <div className="space-y-3 p-4 rounded-xl border border-border bg-secondary/50 shadow-sm">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-foreground">
                  Creativity (Temperature)
                </label>
                <span className="px-2.5 py-0.5 rounded-md text-sm font-bold bg-sky-500/20 text-sky-600 dark:text-sky-300 border border-sky-500/30">
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
            className="w-full h-13 text-base font-bold bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white shadow-xl shadow-sky-500/25 active:scale-[0.99] transition-all rounded-xl cursor-pointer"
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
              <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-sky-500" />
                Generated Prompts ({prompts.length})
              </h2>
            </div>

            <div className="space-y-6">
              {prompts.map((promptItem, index) => (
                <Card
                  key={index}
                  className="relative overflow-hidden border border-border bg-card shadow-2xl rounded-2xl"
                >
                  <CardHeader className="pb-3 border-b border-border bg-secondary/40 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-500/20 text-xs font-bold text-sky-600 dark:text-sky-300 border border-sky-500/30">
                          {index + 1}
                        </span>
                        <CardTitle className="text-base font-bold text-foreground">
                          Prompt {index + 1}
                        </CardTitle>
                      </div>

                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleCopy(promptItem, index)}
                        className="h-8 gap-1.5 font-bold shadow-sm bg-secondary hover:bg-sky-600 text-foreground hover:text-white border border-border"
                      >
                        {copiedIndex === index ? (
                          <>
                            <Check className="w-4 h-4 text-emerald-500" />
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
                    <div className="p-4 rounded-xl border border-emerald-500/30 dark:border-emerald-500/40 bg-emerald-500/10 dark:bg-emerald-950/30 space-y-2 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-200 border border-emerald-500/30">
                          🥁 Rhythm
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopySection("Rhythm", promptItem.rhythm, `rhythm-${index}`)}
                          className="h-7 px-2.5 text-xs text-emerald-700 dark:text-emerald-200 hover:bg-emerald-500/20 font-semibold"
                        >
                          {copiedSection === `rhythm-${index}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </Button>
                      </div>
                      <p className="text-sm text-foreground font-medium leading-relaxed pl-1">
                        {promptItem.rhythm || "N/A"}
                      </p>
                    </div>

                    {/* Style Box */}
                    <div className="p-4 rounded-xl border border-sky-500/30 dark:border-sky-500/40 bg-sky-500/10 dark:bg-sky-950/30 space-y-2 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-500/20 text-sky-700 dark:text-sky-200 border border-sky-500/30">
                          🎨 Style
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopySection("Style", promptItem.style, `style-${index}`)}
                          className="h-7 px-2.5 text-xs text-sky-700 dark:text-sky-200 hover:bg-sky-500/20 font-semibold"
                        >
                          {copiedSection === `style-${index}` ? (
                            <Check className="w-3.5 h-3.5 text-sky-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </Button>
                      </div>
                      <p className="text-sm text-foreground font-medium leading-relaxed pl-1">
                        {promptItem.style || "N/A"}
                      </p>
                    </div>

                    {/* Details Box */}
                    <div className="p-4 rounded-xl border border-indigo-500/30 dark:border-indigo-500/40 bg-indigo-500/10 dark:bg-indigo-950/30 space-y-2 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-700 dark:text-indigo-200 border border-indigo-500/30">
                          🎛️ Details
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopySection("Details", promptItem.details, `details-${index}`)}
                          className="h-7 px-2.5 text-xs text-indigo-700 dark:text-indigo-200 hover:bg-indigo-500/20 font-semibold"
                        >
                          {copiedSection === `details-${index}` ? (
                            <Check className="w-3.5 h-3.5 text-indigo-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </Button>
                      </div>
                      <p className="text-sm text-foreground font-medium leading-relaxed pl-1">
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

      <footer className="border-t border-border bg-card/90 mt-auto">
        <div className="max-w-4xl mx-auto px-4 py-4 text-center text-sm text-muted-foreground">
          Music Prompt Generator • Create detailed prompts for AI music generators
        </div>
      </footer>
    </div>
  );
}
