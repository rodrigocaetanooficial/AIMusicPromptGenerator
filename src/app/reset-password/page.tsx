"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2, KeyRound, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const email = (searchParams.get("email") || "").toLowerCase().trim();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (password.length < 6) {
      setMessage({ type: "error", text: "Password must be at least 6 characters." });
      return;
    }
    if (password !== confirm) {
      setMessage({ type: "error", text: "Passwords do not match." });
      return;
    }
    if (!token || !email) {
      setMessage({ type: "error", text: "Invalid reset link. Please request a new one." });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email, password }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setMessage({ type: "error", text: data.error || "Failed to reset password." });
      } else {
        setMessage({ type: "success", text: data.message || "Password updated successfully." });
        setPassword("");
        setConfirm("");
      }
    } catch {
      setMessage({ type: "error", text: "An unexpected error occurred." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4 transition-colors duration-200">
      <div className="w-full max-w-md bg-card border-2 border-border text-card-foreground p-8 shadow-2xl rounded-2xl">
        <div className="flex items-center gap-2 text-primary mb-1">
          <KeyRound className="w-5 h-5" />
          <h1 className="text-xl font-bold">Reset your password</h1>
        </div>
        <p className="text-sm text-muted-foreground font-medium mb-6">
          Choose a new password for {email ? <span className="font-semibold text-foreground">{email}</span> : "your account"}.
        </p>

        {message && (
          <div
            className={`p-3 rounded-xl border-2 text-xs flex items-start gap-2 mb-4 ${
              message.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-600 dark:text-emerald-300 font-semibold"
                : "bg-red-500/10 border-red-500/40 text-red-600 dark:text-red-300 font-semibold"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs font-bold text-foreground">New Password</Label>
            <Input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-input border-2 border-border text-foreground text-sm h-10 rounded-xl"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs font-bold text-foreground">Confirm Password</Label>
            <Input
              type="password"
              required
              placeholder="••••••••"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="bg-input border-2 border-border text-foreground text-sm h-10 rounded-xl"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-primary hover:bg-primary text-white font-bold rounded-xl mt-2 shadow-md"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reset Password"}
          </Button>
        </form>

        <div className="text-center pt-4">
          <Link href="/" className="text-xs text-primary hover:underline font-bold inline-flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" />
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
