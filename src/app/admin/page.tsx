"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { format } from "date-fns";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Users,
  UserPlus,
  UserCheck,
  Radio,
  Globe,
  Sparkles,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Lock,
  RefreshCw,
  Clock,
  Search,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { noAutofillProps } from "@/lib/no-autofill";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface AdminStats {
  users: { total: number; withGoogle: number; withEmail: number };
  registered24h: number;
  active24h: number;
  onlineNow: number;
  anonVisitors24h: number;
  prompts: { total: number; last24h: number };
  promptsByProvider: Array<{ provider: string; count: number }>;
  promptsByDay: Array<{ date: string; count: number }>;
  onlineUsers: Array<{
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    lastActiveAt: string;
  }>;
  anonVisitors: Array<{
    id: string;
    ipAddress: string;
    lastSeenAt: string;
  }>;
  recentUsers: Array<{
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    createdAt: string;
    lastActiveAt: string;
    hasGoogle: boolean;
  }>;
  recentPrompts: Array<{
    id: string;
    provider: string;
    model: string;
    createdAt: string;
    user: { name: string | null; email: string } | null;
  }>;
}

interface LiveData {
  onlineUsers: AdminStats["onlineUsers"];
  anonVisitors: AdminStats["anonVisitors"];
  onlineNow: number;
}

interface AdminUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  createdAt: string;
  lastActiveAt: string;
  provider: "google" | "email" | "none";
}

function fmtDate(iso: string) {
  return format(new Date(iso), "dd/MM/yyyy HH:mm");
}

function fmtIso(iso: string) {
  return new Date(iso).toISOString();
}

function isOnline(lastActiveAt: string) {
  return new Date().getTime() - new Date(lastActiveAt).getTime() < 5 * 60 * 1000;
}

export default function AdminPage() {
  const router = useRouter();
  const { status } = useSession();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [live, setLive] = useState<LiveData | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  // null = still resolving; true = admin; false = not admin
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const hasFetched = useRef(false);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Resolve admin status from the server (never match emails client-side)
  useEffect(() => {
    if (status !== "authenticated" || isAdmin !== null) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/me", { cache: "no-store" });
        if (!cancelled) setIsAdmin(res.ok);
      } catch {
        if (!cancelled) setIsAdmin(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status, isAdmin]);

  const fetchStats = useCallback(async () => {
    try {
      if (!stats) setLoading(true);
      setRefreshing(true);
      const res = await fetch("/api/admin/stats", { cache: "no-store" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to fetch stats (${res.status})`);
      }
      const data: AdminStats = await res.json();
      setStats(data);
      setLive({
        onlineUsers: data.onlineUsers,
        anonVisitors: data.anonVisitors,
        onlineNow: data.onlineNow,
      });
      setError("");
    } catch (err: any) {
      setError(err.message || "Error loading metrics");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [stats]);

  const fetchLive = useCallback(async () => {
    try {
      setRefreshing(true);
      const res = await fetch("/api/admin/live", { cache: "no-store" });
      if (res.ok) {
        const data: LiveData = await res.json();
        setLive(data);
        setStats((prev) =>
          prev
            ? {
                ...prev,
                onlineUsers: data.onlineUsers,
                anonVisitors: data.anonVisitors,
                onlineNow: data.onlineNow,
              }
            : prev
        );
      }
    } catch {
      // keep stale data
    } finally {
      setRefreshing(false);
    }
  }, []);

  const fetchUsers = useCallback(async (q: string) => {
    try {
      const res = await fetch(
        `/api/admin/users?search=${encodeURIComponent(q)}`,
        { cache: "no-store" }
      );
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch {
      // ignore
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    if (status === "authenticated" && isAdmin === true) {
      if (!hasFetched.current) {
        hasFetched.current = true;
        fetchStats();
        fetchUsers("");
      }
    }
  }, [status, isAdmin, fetchStats, fetchUsers]);

  // Auto-refresh live every 60s, paused when hidden
  useEffect(() => {
    if (status !== "authenticated") return;
    if (isAdmin !== true) return;

    const tick = () => {
      if (document.visibilityState === "visible") {
        fetchLive();
      }
    };
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [status, isAdmin, fetchLive]);

  // Search debounce
  useEffect(() => {
    if (status !== "authenticated") return;
    if (isAdmin !== true) return;

    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    searchDebounce.current = setTimeout(() => {
      fetchUsers(search);
    }, 400);
    return () => {
      if (searchDebounce.current) clearTimeout(searchDebounce.current);
    };
  }, [search, fetchUsers, status, isAdmin]);

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoggingIn(true);
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setLoggingIn(false);
    if (result?.error) {
      setLoginError("Invalid credentials");
      return;
    }
    router.refresh();
    window.location.reload();
  };

  // Loading screen (initial auth check, or admin status still resolving)
  if (status === "loading" || (status === "authenticated" && isAdmin === null)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-[#141c2c]">
        <Loader2 className="h-10 w-10 animate-spin text-sky-500" />
      </div>
    );
  }

  // Login screen
  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-[#141c2c] px-4">
        <Card className="w-full max-w-md dark:bg-[#1e2a3e] dark:border-slate-700">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-slate-900 dark:text-white">
              Admin
            </CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-300">
              Sign in to continue
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              variant="outline"
              className="w-full dark:border-slate-600 dark:text-white"
              onClick={() => signIn("google", { callbackUrl: "/admin" })}
            >
              Continue with Google
            </Button>
            <div className="flex items-center gap-2">
              <Separator className="flex-1 dark:bg-slate-700" />
              <span className="text-xs text-slate-500 dark:text-slate-400">or</span>
              <Separator className="flex-1 dark:bg-slate-700" />
            </div>
            <form onSubmit={handleCredentialsLogin} className="space-y-3">
              <div className="space-y-1">
                <label htmlFor="admin-email" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Email
                </label>
                <Input
                  id="admin-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="admin-password" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Password
                </label>
                <Input
                  id="admin-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                />
              </div>
              {loginError && (
                <p className="text-sm text-red-500">{loginError}</p>
              )}
              <Button
                type="submit"
                className="w-full"
                disabled={loggingIn}
              >
                {loggingIn && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign in
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Restricted (authenticated, but not the admin)
  if (isAdmin !== true) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-[#141c2c] px-4">
        <Card className="w-full max-w-md dark:bg-[#1e2a3e] dark:border-slate-700">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700">
              <Lock className="h-6 w-6 text-slate-600 dark:text-slate-300" />
            </div>
            <CardTitle className="text-xl text-slate-900 dark:text-white">
              Access restricted
            </CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-300">
              Your account doesn&apos;t have permission to access this area
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button variant="outline" onClick={() => router.push("/")}>
              Back to home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Admin dashboard
  const data = stats;

  const mergedActivity = [
    ...(data?.onlineUsers || []).map((u) => ({
      type: "user" as const,
      id: u.id,
      name: u.name || u.email,
      email: u.email,
      image: u.image,
      lastActive: u.lastActiveAt,
    })),
    ...(data?.anonVisitors || []).map((v) => ({
      type: "visitor" as const,
      id: v.id,
      name: "Guest",
      email: v.ipAddress,
      image: null,
      lastActive: v.lastSeenAt,
    })),
  ].sort(
    (a, b) =>
      new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime()
  );

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#141c2c] text-slate-900 dark:text-white">
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/")}
              className="dark:border-slate-600 dark:text-slate-300"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Generator
            </Button>
            <h1 className="text-2xl font-bold sm:text-3xl">Admin Dashboard</h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Real-time monitoring of users, activity and prompt generation
            </p>
          </div>
          <div aria-live="polite">
            <Badge
              variant="outline"
              className="gap-1.5 dark:border-slate-600 dark:text-slate-300"
            >
              {refreshing ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span className="sr-only">Refreshing data in background...</span>
                  Updating...
                </>
              ) : (
                <>
                  <Clock className="h-3.5 w-3.5" />
                  Auto-refresh 60s
                </>
              )}
            </Badge>
          </div>
        </div>

        {/* Error banner */}
        {error && !data && (
          <Card className="mt-6 border-red-500/20 bg-red-500/5 dark:border-red-500/20 dark:bg-red-500/5">
            <CardContent className="flex flex-col items-center gap-3 py-8">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <p className="text-red-600 dark:text-red-400">{error}</p>
              <Button variant="outline" onClick={fetchStats}>
                Try again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* KPI Cards */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <KpiCard
            icon={<Users className="h-5 w-5 text-sky-500" />}
            label="Total Users"
            value={data?.users.total}
            loading={loading}
            footer={`${data?.users.withGoogle ?? 0} Google · ${data?.users.withEmail ?? 0} Email`}
          />
          <KpiCard
            icon={<UserPlus className="h-5 w-5 text-emerald-500" />}
            label="Registered 24h"
            value={data?.registered24h}
            loading={loading}
          />
          <KpiCard
            icon={<UserCheck className="h-5 w-5 text-sky-500" />}
            label="Logged in 24h"
            value={data?.active24h}
            loading={loading}
          />
          <KpiCard
            icon={<Radio className="h-5 w-5 text-emerald-500" />}
            label="Online Now"
            value={data?.onlineNow}
            loading={loading}
            pulse
          />
          <KpiCard
            icon={<Globe className="h-5 w-5 text-amber-500" />}
            label="Visitors 24h"
            value={data?.anonVisitors24h}
            loading={loading}
          />
          <KpiCard
            icon={<Sparkles className="h-5 w-5 text-violet-500" />}
            label="Prompts Generated"
            value={data?.prompts.total}
            loading={loading}
            footer={
              data?.prompts.last24h
                ? `+${data.prompts.last24h} in 24h`
                : undefined
            }
            footerClass="text-emerald-500"
          />
        </div>

        {/* Live Activity */}
        <Card className="mt-6 dark:bg-[#1e2a3e] dark:border-slate-700">
          <CardHeader>
            <CardTitle className="text-lg">Live Activity</CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-300">
              Users and visitors active in the last 24 hours
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto min-w-[600px]">
              <Table>
                <caption className="sr-only">
                  Live activity table showing online users and anonymous visitors
                </caption>
                <TableHeader>
                  <TableRow className="dark:border-slate-700">
                    <TableHead scope="col" className="text-xs uppercase tracking-wide font-semibold text-slate-600 dark:text-slate-300">
                      Identification
                    </TableHead>
                    <TableHead scope="col" className="text-xs uppercase tracking-wide font-semibold text-slate-600 dark:text-slate-300">
                      Contact
                    </TableHead>
                    <TableHead scope="col" className="text-xs uppercase tracking-wide font-semibold text-slate-600 dark:text-slate-300">
                      Status
                    </TableHead>
                    <TableHead scope="col" className="text-xs uppercase tracking-wide font-semibold text-slate-600 dark:text-slate-300 text-right">
                      Last Active
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && !data ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i} className="dark:border-slate-700">
                        <TableCell><Skeleton className="h-5 w-32 bg-slate-200 dark:bg-slate-700/50" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-40 bg-slate-200 dark:bg-slate-700/50" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-20 bg-slate-200 dark:bg-slate-700/50" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-5 w-28 ml-auto bg-slate-200 dark:bg-slate-700/50" /></TableCell>
                      </TableRow>
                    ))
                  ) : mergedActivity.length === 0 ? (
                    <TableRow className="dark:border-slate-700">
                      <TableCell colSpan={4} className="text-center py-8 text-slate-500 dark:text-slate-400">
                        <Users className="mx-auto mb-2 h-8 w-8 opacity-40" />
                        No activity recorded in this period
                      </TableCell>
                    </TableRow>
                  ) : (
                    mergedActivity.map((row) => {
                      const online =
                        row.type === "user" && isOnline(row.lastActive);
                      return (
                        <TableRow key={`${row.type}-${row.id}`} className="dark:border-slate-700">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              {row.type === "user" ? (
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={row.image || undefined} />
                                  <AvatarFallback className="bg-sky-500/10 text-sky-500">
                                    <UserRound className="h-4 w-4" />
                                  </AvatarFallback>
                                </Avatar>
                              ) : (
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/10">
                                  <Globe className="h-4 w-4 text-amber-500" />
                                </div>
                              )}
                              <span className="font-medium">
                                {row.type === "user" ? row.name : "Guest"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-slate-600 dark:text-slate-300">
                            {row.email}
                          </TableCell>
                          <TableCell>
                            {online ? (
                              <Badge variant="outline" className="gap-1 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 animate-pulse">
                                <Radio className="h-3 w-3" />
                                Online Now
                              </Badge>
                            ) : row.type === "user" ? (
                              <Badge variant="outline" className="border-sky-500/30 text-sky-600 dark:text-sky-400">
                                Authenticated
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-amber-500/30 text-amber-600 dark:text-amber-400">
                                Visitor
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                              <Clock className="h-3 w-3" />
                              <time dateTime={fmtIso(row.lastActive)}>
                                {fmtDate(row.lastActive)}
                              </time>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Charts */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 dark:bg-[#1e2a3e] dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-lg">Prompt History (14 days)</CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-300">
                Daily prompt generation volume
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[280px] w-full">
                {loading && !data ? (
                  <Skeleton className="h-full w-full bg-slate-200 dark:bg-slate-700/50" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data?.promptsByDay || []}>
                      <defs>
                        <linearGradient id="promptGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: "#94a3b8", fontSize: 11 }}
                        tickFormatter={(v: string) =>
                          format(new Date(v + "T00:00:00"), "dd/MM")
                        }
                      />
                      <YAxis
                        tick={{ fill: "#94a3b8", fontSize: 11 }}
                        allowDecimals={false}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: "#0f172a",
                          border: "1px solid #1e293b",
                          borderRadius: "0.5rem",
                          color: "#e2e8f0",
                        }}
                        labelFormatter={(v: string) =>
                          format(new Date(v + "T00:00:00"), "dd/MM/yyyy")
                        }
                      />
                      <Area
                        type="monotone"
                        dataKey="count"
                        name="Prompts"
                        stroke="#38bdf8"
                        strokeWidth={2}
                        fill="url(#promptGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="dark:bg-[#1e2a3e] dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-lg">Prompts by Provider</CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-300">
                Last 24 hours
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading && !data ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-6 w-full bg-slate-200 dark:bg-slate-700/50" />
                  ))}
                </div>
              ) : (data?.promptsByProvider || []).length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No prompts in the last 24 hours
                </p>
              ) : (
                <div className="space-y-4">
                  {(data?.promptsByProvider || []).map((p) => {
                    const total = data?.prompts.last24h || 1;
                    const pct = Math.round((p.count / total) * 100);
                    return (
                      <div key={p.provider}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span className="font-medium text-slate-700 dark:text-slate-200">
                            {p.provider}
                          </span>
                          <span className="text-slate-500 dark:text-slate-400">
                            {p.count} ({pct}%)
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700">
                          <div
                            className="h-2 rounded-full bg-sky-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Registered Users + Recent Registrations */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2 dark:bg-[#1e2a3e] dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-lg">Registered Users</CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-300">
                Search and browse all registered accounts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  {...noAutofillProps("admin-user-search")}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name or email..."
                  className="pl-9 dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                />
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <caption className="sr-only">Registered users table</caption>
                  <TableHeader>
                    <TableRow className="dark:border-slate-700">
                      <TableHead scope="col" className="text-xs uppercase tracking-wide font-semibold text-slate-600 dark:text-slate-300">
                        User
                      </TableHead>
                      <TableHead scope="col" className="text-xs uppercase tracking-wide font-semibold text-slate-600 dark:text-slate-300">
                        Email
                      </TableHead>
                      <TableHead scope="col" className="text-xs uppercase tracking-wide font-semibold text-slate-600 dark:text-slate-300">
                        Auth
                      </TableHead>
                      <TableHead scope="col" className="text-xs uppercase tracking-wide font-semibold text-slate-600 dark:text-slate-300">
                        Registered
                      </TableHead>
                      <TableHead scope="col" className="text-xs uppercase tracking-wide font-semibold text-slate-600 dark:text-slate-300">
                        Last Active
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.length === 0 ? (
                      <TableRow className="dark:border-slate-700">
                        <TableCell colSpan={5} className="text-center py-8 text-slate-500 dark:text-slate-400">
                          No users found
                        </TableCell>
                      </TableRow>
                    ) : (
                      users.map((u) => (
                        <TableRow key={u.id} className="dark:border-slate-700">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={u.image || undefined} />
                                <AvatarFallback className="bg-sky-500/10 text-sky-500">
                                  <UserRound className="h-4 w-4" />
                                </AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{u.name || "—"}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-slate-600 dark:text-slate-300">
                            {u.email}
                          </TableCell>
                          <TableCell>
                            {u.provider === "google" ? (
                              <Badge variant="outline" className="border-sky-500/30 text-sky-600 dark:text-sky-400">
                                Google
                              </Badge>
                            ) : u.provider === "email" ? (
                              <Badge variant="outline" className="border-slate-500/30 text-slate-600 dark:text-slate-400">
                                Email
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-slate-500/30 text-slate-500 dark:text-slate-400">
                                None
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                              <Clock className="h-3 w-3" />
                              <time dateTime={fmtIso(u.createdAt)}>
                                {fmtDate(u.createdAt)}
                              </time>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="inline-flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                              <Clock className="h-3 w-3" />
                              <time dateTime={fmtIso(u.lastActiveAt)}>
                                {fmtDate(u.lastActiveAt)}
                              </time>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                {users.length} user{users.length !== 1 ? "s" : ""} total
              </p>
            </CardContent>
          </Card>

          <Card className="dark:bg-[#1e2a3e] dark:border-slate-700">
            <CardHeader>
              <CardTitle className="text-lg">Recent Registrations</CardTitle>
              <CardDescription className="text-slate-600 dark:text-slate-300">
                Latest sign-ups
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {loading && !data ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700/50" />
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-24 bg-slate-200 dark:bg-slate-700/50" />
                          <Skeleton className="h-3 w-32 bg-slate-200 dark:bg-slate-700/50" />
                        </div>
                      </div>
                      <Skeleton className="h-4 w-16 bg-slate-200 dark:bg-slate-700/50" />
                    </div>
                  ))
                ) : (data?.recentUsers || []).length === 0 ? (
                  <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                    No recent registrations
                  </p>
                ) : (
                  (data?.recentUsers || []).map((u) => (
                    <div key={u.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarImage src={u.image || undefined} />
                          <AvatarFallback className="bg-sky-500/10 text-sky-500">
                            <UserRound className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{u.name || "—"}</p>
                          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                            {u.email}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-1">
                        {u.hasGoogle ? (
                          <Badge variant="outline" className="border-sky-500/30 text-sky-600 dark:text-sky-400 text-[10px]">
                            Google
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-slate-500/30 text-slate-600 dark:text-slate-400 text-[10px]">
                            Email
                          </Badge>
                        )}
                        <div className="inline-flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                          <Clock className="h-3 w-3" />
                          <time dateTime={fmtIso(u.createdAt)}>
                            {fmtDate(u.createdAt)}
                          </time>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  loading,
  footer,
  footerClass,
  pulse,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | undefined;
  loading: boolean;
  footer?: string;
  footerClass?: string;
  pulse?: boolean;
}) {
  return (
    <Card className="dark:bg-[#1e2a3e] dark:border-slate-700">
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className={pulse ? "animate-pulse" : ""}>{icon}</div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
            {loading ? (
              <Skeleton className="mt-1 h-7 w-16 bg-slate-200 dark:bg-slate-700/50" />
            ) : (
              <p className="text-2xl font-bold">{value ?? 0}</p>
            )}
          </div>
        </div>
        {footer && !loading && (
          <p className={`mt-2 text-xs ${footerClass || "text-slate-500 dark:text-slate-400"}`}>
            {footer}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
