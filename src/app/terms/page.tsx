import type { Metadata } from "next";
import Link from "next/link";
import { FileText, CheckCircle2, ShieldAlert, Cpu, ArrowLeft } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service - AI Music Prompt Generator",
  description: "Read the Terms of Service for using AI Music Prompt Generator developed by ViaWeb.",
};

export default function TermsOfService() {
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
          <span className="text-xs font-mono text-muted-foreground">User Agreement</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-10 space-y-8">
        {/* Title */}
        <div className="space-y-3 text-center sm:text-left border-b border-border pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-500 text-xs font-bold">
            <FileText className="w-4 h-4" />
            Terms & Conditions
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Terms of Service</h1>
          <p className="text-sm text-muted-foreground">Effective Date: August 1, 2026</p>
        </div>

        {/* Content Sections */}
        <div className="space-y-6 text-sm text-foreground/90 leading-relaxed">
          <section className="space-y-2 p-6 rounded-2xl border border-border bg-card shadow-sm">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-sky-500" />
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or using AI Music Prompt Generator (&quot;Service&quot;), operated by <strong className="text-foreground">ViaWeb</strong> (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), you agree to be bound by these Terms of Service. If you do not agree, please do not use the Service.
            </p>
          </section>

          <section className="space-y-2 p-6 rounded-2xl border border-border bg-card shadow-sm">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Cpu className="w-4 h-4 text-sky-500" />
              2. Description of Service
            </h2>
            <p>
              AI Music Prompt Generator provides tools to engineer structured music generation prompts for AI platforms such as Suno and Udio. The Service connects to third-party AI model providers using API keys provided by the user or system defaults.
            </p>
          </section>

          <section className="space-y-2 p-6 rounded-2xl border border-border bg-card shadow-sm">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-sky-500" />
              3. Responsible Prompt Creation Rules
            </h2>
            <p>
              When engineering prompts using our Service, you agree strictly NOT to:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground font-medium">
              <li>Request or attempt to generate prompts featuring real artist, band, singer, or celebrity names.</li>
              <li>Include copyrighted song titles or copyrighted lyrical material.</li>
              <li>Generate prompts intended for unlawful, defamatory, or harmful purposes.</li>
            </ul>
          </section>

          <section className="space-y-2 p-6 rounded-2xl border border-border bg-card shadow-sm">
            <h2 className="text-lg font-bold text-foreground">4. API Usage & Third-Party Charges</h2>
            <p className="text-muted-foreground font-medium">
              You are responsible for managing your API keys and monitoring usage limits and billing on your provider accounts (OpenAI, Google Gemini, Groq, OpenRouter, etc.). We are not liable for third-party API usage fees or rate-limit suspensions.
            </p>
          </section>

          <section className="space-y-2 p-6 rounded-2xl border border-border bg-card shadow-sm">
            <h2 className="text-lg font-bold text-foreground">5. Limitation of Liability</h2>
            <p className="text-muted-foreground font-medium">
              The Service is provided &quot;as is&quot; without warranties of any kind. ViaWeb shall not be held liable for any indirect, incidental, or consequential damages resulting from the use or inability to use the Service.
            </p>
          </section>

          <section className="space-y-2 p-6 rounded-2xl border border-border bg-card shadow-sm">
            <h2 className="text-lg font-bold text-foreground">6. Contact Information</h2>
            <p className="text-muted-foreground font-medium">
              For questions regarding these Terms, please contact ViaWeb at <a href="https://www.viaweb.pro" target="_blank" rel="noopener noreferrer" className="text-sky-500 font-bold hover:underline">https://www.viaweb.pro</a>.
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-border bg-card py-6 mt-12 text-center text-xs text-muted-foreground">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span suppressHydrationWarning>© {new Date().getFullYear()} ViaWeb. All rights reserved.</span>
          <div className="flex gap-4">
            <Link href="/" className="hover:text-foreground">Home</Link>
            <Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link>
            <Link href="/terms" className="text-sky-500 font-bold">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
