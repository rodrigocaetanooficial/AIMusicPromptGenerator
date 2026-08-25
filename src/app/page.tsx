"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
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
  ChevronRight,
  ChevronUp,
  Search,
  ShieldCheck,
  Cpu,
  LogOut,
  UserPlus,
  LogIn,
  CheckCircle2,
  AlertCircle,
  X,
  Braces,
  ExternalLink,
  KeyRound,
  Activity,
  Flame,
  Headphones,
  Palette,
  Radio,
  Sliders,
  Volume2,
  Waves,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
    clearProviderKeys,
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
  const [copiedJsonIndex, setCopiedJsonIndex] = useState<number | null>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [groupedModelOpen, setGroupedModelOpen] = useState(false);
  const [providerOpen, setProviderOpen] = useState(false);
  const [groupedModelQuery, setGroupedModelQuery] = useState("");
  const [loadingProviderId, setLoadingProviderId] = useState<string | null>(null);
  const [providerSearch, setProviderSearch] = useState("");
  const [modelSearchByProvider, setModelSearchByProvider] = useState<Record<string, string>>({});
  const [expandedProvider, setExpandedProvider] = useState<string | null>(provider);

  // Auth Dialog state
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register" | "forgot">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Save-settings notice (logged-out users): shown on EVERY visit while logged out.
  // Dismissal lasts for the current page view only (no localStorage persistence).
  const [noticeDismissed, setNoticeDismissed] = useState(false);

  const dismissNotice = useCallback(() => {
    setNoticeDismissed(true);
  }, []);

  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-scroll to generated prompts section when available
  useEffect(() => {
    if (prompts.length > 0) {
      const timer = setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [prompts]);

  const isHydratedRef = useRef(false);
  const lastSyncedRef = useRef("");

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
          // SECURITY: server is the source of truth once authenticated.
          // Drop ALL locally-held keys (localStorage may hold keys the user
          // typed while logged out), then apply exactly what the server
          // returned — otherwise a new account would inherit local keys.
          clearProviderKeys();
          if (data.providerConfigs && typeof data.providerConfigs === "object") {
            for (const [pId, cfg] of Object.entries<any>(data.providerConfigs)) {
              if (cfg.apiKey) setProviderApiKey(pId, cfg.apiKey);
              if (cfg.enabled !== undefined) setProviderEnabled(pId, cfg.enabled);
              if (Array.isArray(cfg.fetchedModels)) setFetchedModels(pId, cfg.fetchedModels);
            }
          }
          isHydratedRef.current = true;
          const s = useAppStore.getState();
          lastSyncedRef.current = JSON.stringify({
            provider: s.provider,
            model: s.model,
            theme: s.theme,
            providerConfigs: s.providerConfigs,
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
          title: "Account Email Verified",
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

  // Models available for the currently active provider (respects enabled/disabled state)
  const activeGroupModels =
    groupedEnabledModels.find((g) => g.provider.id === provider)?.models ?? [];

  // New-user detection: nothing configured yet (no key on any provider, no model chosen)
  const needsSetup = !model && !providers.some((p) => !!getProviderConfig(p.id).apiKey);

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

    if (authMode === "forgot") {
      try {
        const res = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: authEmail }),
        });
        const data = await res.json();
        setAuthMessage({
          type: "success",
          text: data.message || "If an account exists for this email, a password reset link has been sent.",
        });
      } catch (err) {
        setAuthMessage({ type: "error", text: "An unexpected error occurred." });
      } finally {
        setAuthLoading(false);
      }
      return;
    }

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

  const handleCopyJson = async (promptItem: GeneratedPrompt, index: number) => {
    const json = JSON.stringify(
      {
        rhythm: promptItem.rhythm,
        style: promptItem.style,
        details: promptItem.details,
      },
      null,
      2
    );
    await navigator.clipboard.writeText(json);
    setCopiedJsonIndex(index);
    toast({
      title: "Copied JSON!",
      description: `Prompt ${index + 1} copied as JSON`,
    });
    setTimeout(() => setCopiedJsonIndex(null), 2000);
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
      <header>
        <div className="wrap h-in">
          <div className="brand">
            <img
              src={isDark ? "/ai-music-dark.webp" : "/ai-music-light.webp"}
              alt="AI Music Prompt Studio"
              className="h-9 w-auto object-contain"
            />
          </div>

          <div className="h-actions">
            {/* Quick Theme Switcher Button */}
            {mounted && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTheme(isDark ? "light" : "dark")}
                className="btn"
                title={isDark ? "Switch to Light Theme" : "Switch to Dark Theme"}
              >
                {isDark ? (
                  <>
                    <Sun className="w-4 h-4 text-amber-400" />
                    <span className="text-xs hidden sm:inline">Light</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4 text-slate-700" />
                    <span className="text-xs hidden sm:inline">Dark</span>
                  </>
                )}
              </Button>
            )}

            {/* Settings Dialog Trigger */}
            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="btn">
                  <Settings className="w-4 h-4 text-primary" />
                  <span className="hidden sm:inline">Settings</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-2 border-border text-card-foreground p-6 shadow-2xl rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold flex items-center gap-2 text-primary">
                    <Cpu className="w-5 h-5" />
                    Provider & Model Manager
                  </DialogTitle>
                  <DialogDescription className="text-muted-foreground font-medium">
                    Configure API keys for multiple providers, activate providers, and toggle individual models ON/OFF.
                  </DialogDescription>
                </DialogHeader>

                {/* API key encryption notice */}
                <div className="flex items-start gap-3 p-3.5 rounded-xl border border-primary/30 bg-primary/10">
                  <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                    <strong className="text-foreground">API keys are stored encrypted.</strong>{" "}
                    Keys are encrypted with AES-256-GCM before being saved on the server and are never
                    stored or displayed in plain text.
                  </p>
                </div>

                <div className="space-y-6 pt-2">
                  {/* Theme Switcher in Settings */}
                  <div className="flex items-center justify-between p-4 rounded-xl border-2 border-border bg-secondary/80 shadow-sm">
                    <div className="flex items-center gap-3">
                      {isDark ? (
                        <Moon className="w-5 h-5 text-primary" />
                      ) : (
                        <Sun className="w-5 h-5 text-amber-500" />
                      )}
                      <div>
                        <Label className="font-bold text-foreground block text-sm">Theme Mode</Label>
                        <span className="text-xs text-muted-foreground font-medium">
                          Current theme: <strong className="text-foreground">{isDark ? "Dark Charcoal" : "Clean Light"}</strong>
                        </span>
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
                        <Zap className="w-4 h-4 text-primary" />
                        Configure AI Providers ({providers.length})
                      </Label>
                    </div>

                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Search providers (Google, OpenRouter, Groq, OpenAI...)"
                        value={providerSearch}
                        onChange={(e) => setProviderSearch(e.target.value)}
                        className="pl-10 h-11 bg-input border-2 border-border text-foreground placeholder:text-muted-foreground font-medium rounded-xl shadow-sm focus:border-primary"
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
                            className={`rounded-xl border-2 transition-all duration-200 ${
                              isSelected
                                ? "border-primary bg-primary/10 shadow-md"
                                : cfg.enabled
                                ? "border-border bg-card"
                                : "border-border/50 bg-muted/30 opacity-75"
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
                                  aria-label={isExpanded ? `Collapse ${p.name}` : `Expand ${p.name}`}
                                >
                                  <ChevronRight
                                    className={`w-4 h-4 transition-transform duration-200 ease-in-out ${
                                      isExpanded ? "rotate-90" : ""
                                    }`}
                                  />
                                </Button>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-foreground text-base">{p.name}</span>
                                    {isSelected && (
                                      <Badge className="bg-primary/20 text-primary dark:text-primary border border-primary/40 text-[10px] font-bold">
                                        Active Default
                                      </Badge>
                                    )}
                                    {cfg.apiKey && (
                                      <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                                        Key Set
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {p.keyUrl && (
                                      <a
                                        href={p.keyUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-semibold"
                                        title={`Get an API key from ${p.name}`}
                                      >
                                        <ExternalLink className="w-3 h-3" />
                                        Get API key
                                      </a>
                                    )}
                                    <span className="text-xs text-muted-foreground block font-mono font-medium">
                                      {pModels.length} models available
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <span className="text-xs font-bold text-muted-foreground hidden sm:inline">
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

                            {/* Expanded Configuration Section (animated) */}
                            <div
                              className={`grid transition-all duration-300 ease-in-out ${
                                isExpanded
                                  ? "grid-rows-[1fr] opacity-100"
                                  : "grid-rows-[0fr] opacity-0 pointer-events-none"
                              }`}
                            >
                              <div className="overflow-hidden">
                                <div className="p-4 border-t-2 border-border bg-secondary/50 space-y-4 rounded-b-xl">
                                {/* API Key Input */}
                                {p.requiresApiKey && (
                                  <div className="space-y-2">
                                    <Label className="text-xs font-bold text-foreground">
                                      {p.name} API Key
                                    </Label>
                                    <div className="flex gap-2">
                                      <Input
                                        type="password"
                                        placeholder={`Enter ${p.name} API Key...`}
                                        value={cfg.apiKey || ""}
                                        onChange={(e) => setProviderApiKey(p.id, e.target.value)}
                                        className="bg-input border-2 border-border text-foreground text-sm font-mono rounded-xl h-10"
                                      />
                                      {p.supportsModelListing && (
                                        <Button
                                          type="button"
                                          variant="secondary"
                                          size="sm"
                                          disabled={loadingProviderId === p.id || !cfg.apiKey}
                                          onClick={() => fetchModelsForProvider(p.id, false)}
                                          className="shrink-0 gap-1.5 bg-secondary text-secondary-foreground border-2 border-border font-bold rounded-xl h-10"
                                        >
                                          {loadingProviderId === p.id ? (
                                            <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                          ) : (
                                            <RefreshCw className="w-4 h-4 text-primary" />
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
                                    className="h-9 bg-input border-2 border-border text-xs text-foreground placeholder:text-muted-foreground rounded-lg"
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
                                            className={`flex items-center justify-between p-2.5 rounded-lg border-2 text-xs transition-colors ${
                                              isCurrentModel
                                                ? "border-primary bg-primary/20 text-foreground"
                                                : isModelDisabled
                                                ? "border-border bg-muted/40 text-muted-foreground opacity-60"
                                                : "border-border bg-card text-foreground hover:bg-accent"
                                            }`}
                                          >
                                            <div className="flex flex-col min-w-0 pr-2">
                                              <div className="flex items-center gap-1.5">
                                                <span className="font-bold truncate text-foreground">{m.name}</span>
                                                {isCurrentModel && (
                                                  <Badge className="bg-primary/30 text-primary dark:text-primary text-[9px] px-1.5 font-bold">
                                                    Selected
                                                  </Badge>
                                                )}
                                              </div>
                                              {m.id !== m.name && (
                                                <span className="font-mono text-[10px] text-muted-foreground font-medium truncate">
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
                                                className="h-6 px-2 text-[10px] bg-secondary hover:bg-primary hover:text-white border border-border font-bold"
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
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    {(() => {
                      const q = providerSearch.trim().toLowerCase();
                      const found = providers.some((p) => !q || p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q));
                      if (found) return null;
                      return (
                        <div className="p-6 text-center text-sm font-semibold text-muted-foreground border-2 border-dashed border-border rounded-xl">
                          No provider found for &quot;{providerSearch}&quot;. Clear the search to see all {providers.length} providers.
                        </div>
                      );
                    })() as React.ReactNode}
                  </div>

                  {/* Save Settings Footer */}
                  <div className="pt-4 border-t-2 border-border flex items-center justify-end gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setSettingsOpen(false)}
                      className="font-bold border-2 border-border rounded-xl"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        if (sessionStatus === "authenticated") {
                          fetch("/api/user/settings", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ provider, model, theme, providerConfigs }),
                          }).catch((err) => console.error("Failed to sync settings:", err));
                        }
                        setSettingsOpen(false);
                        toast({
                          title: "Settings Saved",
                          description: "Your provider configurations and active models have been saved.",
                        });
                      }}
                      className="font-bold bg-primary hover:bg-primary text-white gap-2 shadow-md px-6 rounded-xl"
                    >
                      <Check className="w-4 h-4" />
                      Save Settings
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* User Profile / Login Button */}
            {sessionStatus === "authenticated" && session.user ? (
              <div className="flex items-center gap-2 bg-secondary border-2 border-border rounded-xl p-1 pr-3 shadow-sm">
                {session.user.image ? (
                  <img src={session.user.image} alt="User" className="w-7 h-7 rounded-lg" />
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-primary/20 text-primary font-bold text-xs flex items-center justify-center">
                    {session.user.name?.[0]?.toUpperCase() || "U"}
                  </div>
                )}
                <span className="text-xs font-bold text-foreground hidden sm:inline max-w-[120px] truncate">
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
                className="btn btn-primary"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In / Register</span>
              </Button>
            )}
            </div>
        </div>
      </header>

      {/* Hero */}
      <section className="hero wrap">
        <div className="eyebrow">
          <Sparkles className="w-3 h-3" />
          AI Music Prompt Studio
        </div>
        <h1>
          Your next track starts with a <em>great prompt</em>.
        </h1>
        <p>
          One line of inspiration becomes a precise, production-ready prompt — rhythm, style and
          technical detail — for every AI music platform.
        </p>
        <div className="chips-row" aria-label="Supported platforms">
          <span className="chip"><Music className="w-3.5 h-3.5" />Suno</span>
          <span className="chip"><Music className="w-3.5 h-3.5" />Udio</span>
          <span className="chip"><Music className="w-3.5 h-3.5" />Music Flow</span>
          <span className="chip"><Music className="w-3.5 h-3.5" />Mureka</span>
        </div>
      </section>

      {/* Save-settings notice for logged-out users (dismissible, shown every visit) */}
      {sessionStatus === "unauthenticated" && !noticeDismissed && (
        <div className="wrap pt-6 pb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl border-2 border-primary/40 bg-primary/10 dark:bg-primary/20 shadow-sm">
            <div className="flex items-start sm:items-center gap-3">
              <UserPlus className="w-5 h-5 text-primary shrink-0 mt-0.5 sm:mt-0" />
              <p className="text-sm font-semibold text-foreground leading-relaxed">
                To save your settings permanently, register and sign in.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setAuthMode("register");
                  setAuthOpen(true);
                }}
                className="h-8 gap-1.5 font-bold border-2 border-border bg-secondary hover:bg-accent text-foreground rounded-xl shadow-sm"
              >
                <UserPlus className="w-3.5 h-3.5 text-primary" />
                Register
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setAuthMode("login");
                  setAuthOpen(true);
                }}
                className="h-8 gap-1.5 font-bold bg-primary hover:bg-primary text-white rounded-xl shadow-md"
              >
                <LogIn className="w-3.5 h-3.5" />
                Sign In
              </Button>
              <button
                type="button"
                onClick={dismissNotice}
                aria-label="Dismiss"
                title="Dismiss"
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Auth Modal (Sign In / Register / Google OAuth) */}
      <Dialog open={authOpen} onOpenChange={setAuthOpen}>
        <DialogContent className="sm:max-w-md bg-card border-2 border-border text-card-foreground p-6 shadow-2xl rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2 text-primary">
              {authMode === "login" ? (
                <LogIn className="w-5 h-5" />
              ) : authMode === "register" ? (
                <UserPlus className="w-5 h-5" />
              ) : (
                <KeyRound className="w-5 h-5" />
              )}
              {authMode === "login" ? "Sign In to Your Account" : authMode === "register" ? "Create Your Account" : "Reset Your Password"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground font-medium">
              {authMode === "login"
                ? "Sign in to permanently save your API keys and active models."
                : authMode === "register"
                ? "Create an account to keep your settings synced permanently across all devices."
                : "Enter your email and we'll send you a link to choose a new password."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Google OAuth Button */}
            <Button
              type="button"
              variant="outline"
              onClick={() => signIn("google")}
              className="w-full h-11 bg-secondary hover:bg-accent border-2 border-border text-foreground gap-2 font-bold shadow-sm rounded-xl"
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
              <span className="absolute bg-card px-3 text-xs text-muted-foreground font-bold uppercase">Or</span>
            </div>

            {/* Auth Message Banner */}
            {authMessage && (
              <div
                className={`p-3 rounded-xl border-2 text-xs flex items-start gap-2 ${
                  authMessage.type === "success"
                    ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-300 font-semibold"
                    : "bg-red-500/10 border-red-500/40 text-red-600 dark:text-red-300 font-semibold"
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
                  <Label className="text-xs font-bold text-foreground">Name</Label>
                  <Input
                    placeholder="Your Name"
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    className="bg-input border-2 border-border text-foreground text-sm h-10 rounded-xl"
                  />
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs font-bold text-foreground">Email Address</Label>
                <Input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="bg-input border-2 border-border text-foreground text-sm h-10 rounded-xl"
                />
              </div>

              {authMode !== "forgot" && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-foreground">Password</Label>
                    {authMode === "login" && (
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMessage(null);
                          setAuthMode("forgot");
                        }}
                        className="text-xs text-primary hover:underline font-semibold"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <Input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="bg-input border-2 border-border text-foreground text-sm h-10 rounded-xl"
                  />
                </div>
              )}

              <Button
                type="submit"
                disabled={authLoading}
                className="w-full h-11 bg-primary hover:bg-primary text-white font-bold rounded-xl mt-2 shadow-md"
              >
                {authLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : authMode === "login" ? (
                  "Sign In"
                ) : authMode === "register" ? (
                  "Create Account & Send Verification Email"
                ) : (
                  "Send Reset Link"
                )}
              </Button>
            </form>

            {/* Switch Mode Toggle */}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  setAuthMessage(null);
                  if (authMode === "login") setAuthMode("register");
                  else if (authMode === "register") setAuthMode("login");
                  else setAuthMode("login");
                }}
                className="text-xs text-primary hover:underline font-bold"
              >
                {authMode === "login"
                  ? "Don't have an account? Register here"
                  : authMode === "register"
                  ? "Already have an account? Sign in"
                  : "Back to sign in"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Main Content */}
      <main className="wrap">
        {/* Main Prompter Card */}
        <section className="studio">
          <div className="label-row">
            <label className="field-label" htmlFor="music-idea">
              <Music className="w-4 h-4" />
              Musical idea
            </label>
            <span className="field-hint">Ctrl + Enter to generate</span>
          </div>
          <textarea
            id="music-idea"
            placeholder="e.g. a warm lo-fi beat with dusty vinyl, Rhodes piano and a rainy-night mood…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />

          {/* Provider & Model — new users see a setup button instead of the selects */}
          {needsSetup ? (
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="w-full h-11 inline-flex items-center justify-center gap-2 text-sm font-bold rounded-[12px] cursor-pointer transition-colors border-2 border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary"
            >
              <Settings className="w-4 h-4" />
              Configure AI Provider / Model
            </button>
          ) : (
          <div className="selects">
            <div className="select-wrap">
              <Popover open={providerOpen} onOpenChange={setProviderOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    role="combobox"
                    aria-expanded={providerOpen}
                    aria-label="AI Provider"
                    className="custom-select flex items-center justify-between pr-3.5"
                  >
                    <span className={`truncate ${provider ? "" : "text-muted-foreground"}`}>
                      {providers.find((p) => p.id === provider)?.name || (provider ? provider : "Select provider")}
                    </span>
                    <ChevronsUpDown className="w-4 h-4 shrink-0 opacity-60" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[var(--radix-popover-trigger-width)] p-0 bg-card border border-border shadow-2xl rounded-2xl"
                  align="start"
                >
                  <Command shouldFilter={false} className="bg-card text-card-foreground">
                    <CommandInput
                      placeholder="Search providers..."
                      value={providerSearch}
                      onValueChange={setProviderSearch}
                      className="h-11"
                    />
                    <CommandList>
                      <CommandGroup heading="AI Providers">
                        {providers
                          .filter((p) =>
                            p.name.toLowerCase().includes(providerSearch.toLowerCase())
                          )
                          .map((p) => {
                            const isSelected = p.id === provider;
                            return (
                              <CommandItem
                                key={p.id}
                                value={p.id}
                                onSelect={() => {
                                  const group = groupedEnabledModels.find(
                                    (g) => g.provider.id === p.id
                                  );
                                  const pModels = group?.models ?? [];
                                  const keepCurrent = pModels.some(
                                    (m) => m.id === model
                                  );
                                  // Sync the model dropdown to this provider:
                                  // keep the current model if it belongs to it, else pick its first enabled model.
                                  setProvider(p.id);
                                  setModel(keepCurrent ? model : (pModels[0]?.id ?? ""));
                                  const key = getActiveProviderKey(p.id);
                                  if (key) setApiKey(key);
                                  toast({
                                    title: "Provider Switched",
                                    description: pModels.length
                                      ? p.name
                                      : `${p.name} (no models enabled)`,
                                  });
                                  setProviderOpen(false);
                                }}
                                className="cursor-pointer"
                              >
                                <div className="flex items-center gap-2 min-w-0 w-full">
                                  <Check
                                    className={`h-4 w-4 text-primary shrink-0 ${isSelected ? "opacity-100" : "opacity-0"}`}
                                  />
                                  <div className="flex flex-col min-w-0">
                                    <span className="font-bold text-sm truncate text-foreground">{p.name}</span>
                                    <span className="text-[11px] text-muted-foreground font-mono truncate">{p.id}</span>
                                  </div>
                                  {isSelected && (
                                    <Badge variant="outline" className="ml-auto text-xs font-bold text-primary border-primary/40 shrink-0">
                                      Active
                                    </Badge>
                                  )}
                                </div>
                              </CommandItem>
                            );
                          })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="select-wrap">
              {!model || activeGroupModels.length === 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSettingsOpen(true)}
                  className="w-full h-11 justify-center gap-2 font-semibold text-sm border border-border bg-secondary hover:bg-accent text-foreground rounded-[12px] cursor-pointer"
                >
                  <Zap className="w-4 h-4 text-primary" />
                  <span>Add or Enable AI Models in Settings</span>
                </Button>
              ) : (
                <Popover open={groupedModelOpen} onOpenChange={setGroupedModelOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      role="combobox"
                      aria-expanded={groupedModelOpen}
                      aria-label="AI Model"
                      className="custom-select flex items-center justify-between pr-3.5"
                    >
                      <span className="truncate">{model}</span>
                      <ChevronsUpDown className="w-4 h-4 shrink-0 opacity-60" />
                    </button>
                  </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-card border-2 border-border shadow-2xl rounded-2xl" align="start">
                  <Command shouldFilter={false} className="bg-card text-card-foreground">
                    <CommandInput
                      placeholder="Search models..."
                      value={groupedModelQuery}
                      onValueChange={setGroupedModelQuery}
                      className="bg-input text-foreground border-border h-11 font-medium"
                    />
                    <CommandList className="max-h-80">
                      <CommandEmpty className="p-4 text-xs text-muted-foreground text-center font-medium">
                        No matching models for this provider. Enable more in Settings!
                      </CommandEmpty>
                      {groupedEnabledModels
                        .filter((g) => g.provider.id === provider)
                        .map(({ provider: p, models: pModels }) => {
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
                          <CommandGroup key={p.id} heading={p.name} className="text-primary font-bold text-xs uppercase px-2 py-1.5">
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
                                  className={`cursor-pointer text-foreground aria-selected:bg-accent flex items-center justify-between p-2.5 rounded-lg border-2 my-1 ${
                                    isSelected ? "border-primary bg-primary/20" : "border-border bg-input hover:bg-accent"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <Check className={`h-4 w-4 text-primary shrink-0 ${isSelected ? "opacity-100" : "opacity-0"}`} />
                                    <div className="flex flex-col min-w-0">
                                      <span className="font-bold text-sm truncate text-foreground">{m.name}</span>
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
            )}
            </div>
          </div>
          )}

          <div className="presets-label">Try an example</div>
          <div className="presets">
              {[
                {
                  label: "80s Synthwave",
                  icon: <Music className="w-3 h-3" />,
                  prompt: "nostalgic 80s synthwave with warm analog Juno-106 pads, a punchy TR-808 drum machine, and a neon-soaked late-night highway mood",
                },
                {
                  label: "Lo-Fi Chill",
                  icon: <Headphones className="w-3 h-3" />,
                  prompt: "relaxing lo-fi hip hop with a mellow Fender Rhodes electric piano, vinyl crackle texture and a smooth boom-bap beat",
                },
                {
                  label: "Epic Orchestral",
                  icon: <Volume2 className="w-3 h-3" />,
                  prompt: "epic cinematic orchestral score with powerful brass sections, fast strings, deep taiko percussion and a heroic rising finale",
                },
                {
                  label: "Dark Techno",
                  icon: <Flame className="w-3 h-3" />,
                  prompt: "dark industrial techno at 142 BPM with distorted metal percussion, a heavy 909 kick, white noise risers and an aggressive drop",
                },
                {
                  label: "Smooth Jazz",
                  icon: <Radio className="w-3 h-3" />,
                  prompt: "smooth jazz quartet with soulful saxophone solo, walking acoustic bass, and brushed drums",
                },
                {
                  label: "Cinematic Ambient",
                  icon: <Waves className="w-3 h-3" />,
                  prompt: "ambient cinematic soundscape with slow evolving pads, soft piano motifs, airy textures and a vast open atmosphere",
                },
              ].map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setInput(item.prompt)}
                  className="preset"
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
          </div>

          <div className="controls">
            <div className="control-box">
              <div className="control-head">
                <span className="control-title">Number of prompts</span>
                <span className="control-val">{promptCount}</span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                step={1}
                value={promptCount}
                onChange={(e) => setPromptCount(Number(e.target.value))}
                aria-label="Number of prompts"
                style={{ "--fill": `${((promptCount - 1) / 9) * 100}%` } as CSSProperties}
              />
            </div>

            <div className="control-box">
              <div className="control-head">
                <span className="control-title">Creativity</span>
                <span className="control-val">{temperature.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min={0.1}
                max={1.5}
                step={0.1}
                value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
                aria-label="Creativity"
                style={{ "--fill": `${((temperature - 0.1) / 1.4) * 100}%` } as CSSProperties}
              />
            </div>
          </div>

          <div className="gen-row">
            <span className="hint">Works with Suno · Udio · Music Flow · Mureka</span>
            <button type="button" className="btn-gen" onClick={handleGenerate} disabled={isGenerating || input.trim().length < 3 || !selectedProvider}>
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate prompts
                </>
              )}
            </button>
          </div>
        </section>

        {/* Results Section */}
        {prompts.length > 0 && (
          <div ref={resultsRef} className="space-y-4 pt-2 scroll-mt-24">
            <div className="results-head">
              <h2>Prompt output</h2>
              <span className="field-hint">{prompts.length} {prompts.length > 1 ? "variants" : "variant"} · Suno &amp; Udio ready</span>
            </div>

            {prompts.map((promptItem, index) => (
              <div key={index} className="result-card">
                <div className="r-head">
                  <div className="r-title">
                    <span className="r-num">{index + 1}</span>Prompt {index + 1}
                  </div>
                  <div className="r-actions">
                    <button className="btn-sm" onClick={() => handleCopy(promptItem, index)}>
                      {copiedIndex === index ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-500" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          Copy full prompt
                        </>
                      )}
                    </button>
                    <button className="btn-sm btn-json" onClick={() => handleCopyJson(promptItem, index)}>
                      {copiedJsonIndex === index ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-500" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Braces className="w-3 h-3" />
                          Copy JSON
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="grid3">
                  <div className="sub-card">
                    <div className="sub-head">
                      <span className="sub-tag tag-rhythm">
                        <Activity className="w-3 h-3" />
                        Rhythm
                      </span>
                      <button className="btn-sub" title="Copy Rhythm" onClick={() => handleCopySection("Rhythm", promptItem.rhythm, `rhythm-${index}`)}>
                        {copiedSection === `rhythm-${index}` ? (
                          <Check className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                    <p className="sub-body">
                      {promptItem.rhythm || "N/A"}
                    </p>
                  </div>

                  <div className="sub-card">
                    <div className="sub-head">
                      <span className="sub-tag tag-style">
                        <Palette className="w-3 h-3" />
                        Style
                      </span>
                      <button className="btn-sub" title="Copy Style" onClick={() => handleCopySection("Style", promptItem.style, `style-${index}`)}>
                        {copiedSection === `style-${index}` ? (
                          <Check className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                    <p className="sub-body">
                      {promptItem.style || "N/A"}
                    </p>
                  </div>

                  <div className="sub-card">
                    <div className="sub-head">
                      <span className="sub-tag tag-details">
                        <Sliders className="w-3 h-3" />
                        Details
                      </span>
                      <button className="btn-sub" title="Copy Details" onClick={() => handleCopySection("Details", promptItem.details, `details-${index}`)}>
                        {copiedSection === `details-${index}` ? (
                          <Check className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                    <p className="sub-body">
                      {promptItem.details || "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* SEO content section — what the site does and how it works */}
      <section
        aria-labelledby="about-heading"
        className="wrap py-10 border-t border-border"
      >
        <h2 id="about-heading" className="text-xl font-bold tracking-tight text-foreground">
          Structured AI Music Prompts for Suno and Udio
        </h2>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          AI Music Prompt Studio turns rough song concepts into precise, production-ready AI music prompts.
          Whether you are building an energetic synthwave track, a low-fidelity hip-hop beat, or an orchestral
          score, broad descriptions often lead to inconsistent audio generations. This free tool structures your
          input into clear musical directives so text-to-audio engines understand the exact tempo, instrumentation,
          and mood you want to produce. The same structured prompts work across the leading AI music platforms —
          including Suno, Udio, Google Music Flow, Mureka, and Happy Shrimp — so you can generate full tracks
          wherever you create.
        </p>

        <h3 className="mt-8 text-base font-bold text-foreground">
          How to Generate Custom Prompts Step by Step
        </h3>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          Creating tailored prompts takes only a few seconds:
        </p>
        <ol className="mt-2 list-decimal list-inside space-y-1.5 text-sm text-muted-foreground leading-relaxed">
          <li>
            <strong className="text-foreground">Enter your core idea:</strong>{" "}
            Describe the genre, atmosphere, or specific instruments you have in mind.
          </li>
          <li>
            <strong className="text-foreground">Adjust your settings:</strong>{" "}
            Choose your preferred AI model, select the number of prompt variants you need (from 1 to 10), and set
            the temperature to control creative variation.
          </li>
          <li>
            <strong className="text-foreground">Copy to your music generator:</strong>{" "}
            Each generated prompt is formatted into three distinct layers—Rhythm, Style, and Details. Copy any
            variant directly into Suno or Udio to generate full tracks.
          </li>
        </ol>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          You can generate prompts anonymously without restrictions. Creating an optional free account lets you
          save your preferred model, temperature settings, and interface theme across sessions.
        </p>

        <h3 className="mt-8 text-base font-bold text-foreground">
          Why Detailed Prompts Matter for Suno and Udio
        </h3>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          Generative audio models interpret prompts differently than text or image models. If you only provide a
          general tag like &quot;rock song,&quot; engines like Suno or Udio must guess critical production factors,
          including BPM, mixing style, vocal processing, and arrangement dynamics. This often leads to wasted
          generation credits on unusable audio.
        </p>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          Knowing how to write AI music prompts requires separating tempo and cadence from sonic texture. The Music
          Prompt Generator organizes every output into three functional sections:
        </p>
        <ul className="mt-2 list-disc list-inside space-y-1.5 text-sm text-muted-foreground leading-relaxed">
          <li>
            <strong className="text-foreground">Rhythm:</strong>{" "}
            Defines the BPM, time signature, groove, and percussion choices.
          </li>
          <li>
            <strong className="text-foreground">Style:</strong>{" "}
            Establishes the core genre, era, production aesthetic, and vocal direction.
          </li>
          <li>
            <strong className="text-foreground">Details:</strong>{" "}
            Adds specific instrumentation, mixing characteristics, and mood modifiers.
          </li>
        </ul>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
          This structured approach gives you predictable results while leaving enough room for the model to compose
          natural transitions and engaging melodies. Whether you need reliable Suno prompts for fast prototyping or
          complex Udio prompts for intricate arrangements, structured formatting gives you direct control over your
          final tracks.
        </p>
      </section>

      <footer className="border-t border-border bg-background mt-auto py-10">
        <div className="wrap">
          {/* Line 1: site logo (left) + links (right) */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <img
              src={isDark ? "/ai-music-dark.webp" : "/ai-music-light.webp"}
              alt="AI Music Prompt Studio"
              className="h-8 w-auto object-contain"
            />
            <nav className="flex items-center gap-5 text-xs font-semibold text-muted-foreground">
              <Link href="/privacy" className="hover:text-primary transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-primary transition-colors">
                Terms of Service
              </Link>
              <a
                href="https://github.com/rodrigocaetanooficial/AIMusicPromptGenerator"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
                title="GitHub Repository"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
                GitHub
              </a>
            </nav>
          </div>

          {/* Centered credits */}
          <div className="mt-8 flex flex-col items-center gap-1.5 text-center">
            <span className="text-xs text-muted-foreground font-medium">Developed by</span>
            <a
              href="https://www.viaweb.pro"
              target="_blank"
              rel="noopener noreferrer"
              title="ViaWeb"
              className="hover:opacity-80 transition-opacity"
            >
              <img
                src="/viaweb.webp"
                alt="ViaWeb Logo"
                className="h-6 w-auto object-contain dark:brightness-110"
              />
            </a>
            <span suppressHydrationWarning className="text-xs text-muted-foreground font-medium">
              © {new Date().getFullYear()} ViaWeb. All rights reserved.
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
