# AI Music Prompt Generator

**Live demo:** [https://ai-music.viaweb.pro](https://ai-music.viaweb.pro)

A powerful, intuitive, and highly customizable web application designed to help musicians, producers, and AI enthusiasts create detailed, production-ready prompts for AI music generators like **Suno**, **Udio**, and others.

---

## ✨ Features

- **Detailed Prompt Generation**: Automatically generates rich prompts covering rhythm, style, and technical details.
- **Universal Provider Support**: Natively supports multiple industry-leading AI API providers:
  - OpenAI
  - NVIDIA NIM
  - DeepSeek
  - Mistral
  - Together AI
  - Groq
  - OpenRouter
  - Perplexity
  - Fireworks AI
  - And more!
- **Auto-Fetch Models**: Simply select a provider and enter your API Key to instantly fetch and list all available models dynamically.
- **Precise Controls**: Adjust the number of prompts and creativity (temperature) for each generation.
- **No Placeholders**: Prompts are structured with specific musical terminology (BPM, instruments, production techniques).
- **Dark Mode Support**: Sleek, modern interface that's easy on the eyes.
- **Privacy Focused**: Your API keys are stored securely in your browser's local storage and are never sent to any external server other than the provider's API.

---

## 🛠️ Getting Started

### Prerequisites

- [Bun](https://bun.sh/) or [Node.js](https://nodejs.org/)
- An API Key from your preferred provider (e.g., OpenAI, Groq, OpenRouter, etc.)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/rodrigocaetanooficial/AIMusicPromptGenerator.git
   cd AIMusicPromptGenerator
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   bun install
   ```

3. Run the development server:
   ```bash
   npm run dev
   # or
   bun dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ⚙️ Configuration

1. Click the **Settings** icon (⚙️) in the top-right corner.
2. Select your preferred **Provider** from the universal list.
3. Enter your **API Key**.
4. The system will automatically fetch and list the models available.
5. Choose your desired **Model**.
6. (Optional) Toggle between Light and Dark mode.

---

## 📅 Changelog

### [v1.1.0] - 2026-04-28
#### Added
- **Universal Provider Support**: Added support for 10+ new OpenAI-compatible API providers including NVIDIA NIM, DeepSeek, Mistral, Together AI, Perplexity, Cerebras, DeepInfra, SambaNova, and Fireworks.
- **Dynamic Model Fetching**: The application now automatically fetches the available model list from the selected provider's API `/models` endpoint.
- **Strict Security Headers**: Implemented comprehensive HTTP security headers in Next.js configuration (CSP, HSTS, Anti-Sniff, X-Frame-Options) to protect against common web vulnerabilities.
- **Lockfile Fixes**: Added `package-lock.json` validation for proper dependency and supply chain integrity management.

#### Changed
- Completely refactored the UI settings to dynamically react to API Key insertions and Provider selections.
- Improved error handling and toast notifications for better UX.

#### Removed
- Removed the manual "Custom Models" configuration as the app now natively fetches any model exposed by the respective API.

---

## 🏗️ Built With

- **[Next.js](https://nextjs.org/)** - App Router, Server Actions
- **[Tailwind CSS](https://tailwindcss.com/)** - Styling
- **[shadcn/ui](https://ui.shadcn.com/)** - UI Components
- **[Zustand](https://github.com/pmndrs/zustand)** - State Management (with persistence)
- **[Lucide React](https://lucide.dev/)** - Iconography

---


---

## Production

- **Demo:** https://ai-music.viaweb.pro
- **Deploy:** push to `main` triggers GitHub Actions (Next.js standalone) to OVH VPS (PM2 + nginx).
- Workflow: `.github/workflows/deploy.yml`.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

Created with ❤️ by [Rodrigo Caetano](https://github.com/rodrigocaetanooficial)
