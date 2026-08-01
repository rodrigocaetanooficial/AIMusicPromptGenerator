import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Lock, Cpu, Database, EyeOff, KeyRound, ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy - AI Music Prompt Generator",
  description: "Learn about how AI Music Prompt Generator protects your API keys, privacy, and personal data using AES-256-GCM encryption.",
};

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      <header className="border-b border-border bg-card/95 backdrop-blur-md sticky top-0 z-50 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-bold text-sky-500 hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Application
          </Link>
          <span className="text-xs font-mono text-muted-foreground">Privacy & Security Guidelines</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10 space-y-8">
        {/* Title */}
        <div className="space-y-3 text-center sm:text-left border-b border-border pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-500 text-xs font-bold">
            <ShieldCheck className="w-4 h-4" />
            Security & Zero-Knowledge Commitment
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">Effective Date: August 1, 2026</p>
        </div>

        {/* Security Highlights Banner */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="p-4 rounded-xl border-2 border-emerald-500/30 bg-emerald-500/10 space-y-2">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-300 font-bold text-sm">
              <Lock className="w-4 h-4" />
              AES-256-GCM Encryption
            </div>
            <p className="text-xs text-foreground/80 leading-relaxed font-medium">
              API keys stored in our database are encrypted server-side with AES-256-GCM. Plain text keys are never written to disk.
            </p>
          </div>

          <div className="p-4 rounded-xl border-2 border-sky-500/30 bg-sky-500/10 space-y-2">
            <div className="flex items-center gap-2 text-sky-600 dark:text-sky-300 font-bold text-sm">
              <EyeOff className="w-4 h-4" />
              Zero-Knowledge Memory
            </div>
            <p className="text-xs text-foreground/80 leading-relaxed font-medium">
              Keys are decrypted in RAM solely during active API calls and cleared immediately. We do not store or sell your prompts.
            </p>
          </div>

          <div className="p-4 rounded-xl border-2 border-indigo-500/30 bg-indigo-500/10 space-y-2">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-300 font-bold text-sm">
              <KeyRound className="w-4 h-4" />
              BYOK & LocalStorage
            </div>
            <p className="text-xs text-foreground/80 leading-relaxed font-medium">
              Anonymous users can use Bring Your Own Key (BYOK). Keys remain exclusively on your device&apos;s browser LocalStorage.
            </p>
          </div>
        </div>

        {/* Content Sections */}
        <div className="space-y-6 text-sm text-foreground/90 leading-relaxed">
          <section className="space-y-2 p-6 rounded-2xl border border-border bg-card shadow-sm">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Database className="w-4 h-4 text-sky-500" />
              1. Information We Collect
            </h2>
            <p>
              When you use AI Music Prompt Generator, we collect minimal data required to deliver prompt generation and keep your settings synchronized:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground font-medium">
              <li><strong className="text-foreground">Anonymous Usage:</strong> If you use the application without creating an account, no personal data or API keys are stored on our servers. Your settings and API keys reside locally in your browser.</li>
              <li><strong className="text-foreground">Authenticated Users:</strong> When you sign in (via Google OAuth or Email), we store your email address, name, avatar URL, and encrypted provider configurations.</li>
            </ul>
          </section>

          <section className="space-y-2 p-6 rounded-2xl border border-border bg-card shadow-sm">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Lock className="w-4 h-4 text-sky-500" />
              2. API Key Protection & Encryption Standards
            </h2>
            <p>
              We treat your AI provider API keys (OpenAI, Google Gemini, Groq, OpenRouter, DeepSeek, etc.) with strict security protocols:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground font-medium">
              <li><strong className="text-foreground">Symmetric Cryptography:</strong> All API keys saved in our SQLite database are encrypted using <strong className="text-foreground">AES-256-GCM</strong> with unique Initialization Vectors (IVs) and authentication tags.</li>
              <li><strong className="text-foreground">No External Transmissions:</strong> Your API keys are only transmitted via SSL/TLS directly to the respective AI provider endpoint specified in your request.</li>
              <li><strong className="text-foreground">Ephemeral Memory Decryption:</strong> Keys are decrypted transiently in server memory during prompt generation calls and garbage-collected immediately.</li>
            </ul>
          </section>

          <section className="space-y-2 p-6 rounded-2xl border border-border bg-card shadow-sm">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Cpu className="w-4 h-4 text-sky-500" />
              3. Third-Party AI Providers
            </h2>
            <p>
              Prompt generation requests are fulfilled by third-party Large Language Model (LLM) providers selected by you in Settings. These providers operate under their respective privacy policies:
            </p>
            <p className="text-muted-foreground font-medium">
              Google AI (Gemini), OpenAI, Groq, OpenRouter, DeepSeek, NVIDIA NIM, Perplexity, Together AI, Fireworks AI, and Ollama. We encourage you to review their privacy disclosures regarding API data processing.
            </p>
          </section>

          <section className="space-y-2 p-6 rounded-2xl border border-border bg-card shadow-sm">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-sky-500" />
              4. Data Control & Deletion
            </h2>
            <p>
              You maintain complete ownership of your data. You may clear your browser LocalStorage at any time, or request full account and key deletion from our database by contacting us.
            </p>
          </section>

          <section className="space-y-2 p-6 rounded-2xl border border-border bg-card shadow-sm">
            <h2 className="text-lg font-bold text-foreground">5. Contact & Credits</h2>
            <p className="text-muted-foreground font-medium">
              AI Music Prompt Generator is developed and operated by <a href="https://www.viaweb.pro" target="_blank" rel="noopener noreferrer" className="text-sky-500 font-bold hover:underline">ViaWeb</a>. For privacy inquiries or data requests, visit <a href="https://www.viaweb.pro" target="_blank" rel="noopener noreferrer" className="text-sky-500 font-bold hover:underline">https://www.viaweb.pro</a>.
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-border bg-card py-6 mt-12 text-center text-xs text-muted-foreground">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span suppressHydrationWarning>© {new Date().getFullYear()} ViaWeb. All rights reserved.</span>
          <div className="flex gap-4">
            <Link href="/" className="hover:text-foreground">Home</Link>
            <Link href="/privacy" className="text-sky-500 font-bold">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-foreground">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
