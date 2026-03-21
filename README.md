# AI Music Prompt Generator 🎵

A powerful and intuitive web application designed to help musicians, producers, and AI enthusiasts create highly detailed, production-ready prompts for AI music generators like **Suno**, **Udio**, and others.

---

## ✨ Features

- **Detailed Prompt Generation**: Automatically generates rich prompts covering rhythm, style, and technical details.
- **Multiple Providers**: Support for **OpenRouter** and **Groq** APIs.
- **Model Customization**: Use pre-defined industry-leading models (Claude 3.5, GPT-4o, Llama 3.3, etc.) or add your own custom model IDs.
- **Precise Controls**: Adjust the number of prompts and creativity (temperature) for each generation.
- **No Placeholders**: Prompts are structured with specific musical terminology (BPM, instruments, production techniques).
- **Dark Mode Support**: Sleek, modern interface that's easy on the eyes.
- **Privacy Focused**: Your API keys are stored locally in your browser and never sent to our servers.

---

## 🛠️ Getting Started

### Prerequisites

- [Bun](https://bun.sh/) or [Node.js](https://nodejs.org/)
- An API Key from [OpenRouter](https://openrouter.ai/) or [Groq](https://console.groq.com/)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/rodrigocaetanooficial/AIMusicPromptGenerator.git
   cd AIMusicPromptGenerator
   ```

2. Install dependencies:
   ```bash
   bun install
   # or
   npm install
   ```

3. Run the development server:
   ```bash
   bun dev
   # or
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ⚙️ Configuration

1. Click the **Settings** icon (⚙️) in the top-right corner.
2. Select your preferred **Provider** (OpenRouter or Groq).
3. Enter your **API Key**.
4. Choose a **Model** from the list or add a custom one.
5. (Optional) Toggle between Light and Dark mode.

---

## 🏗️ Built With

- **[Next.js](https://nextjs.org/)** - App Router, Server Actions
- **[Tailwind CSS](https://tailwindcss.com/)** - Styling
- **[shadcn/ui](https://ui.shadcn.com/)** - UI Components
- **[Zustand](https://github.com/pmndrs/zustand)** - State Management (with persistence)
- **[Lucide React](https://lucide.dev/)** - Iconography

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

Created with ❤️ by [Rodrigo Caetano](https://github.com/rodrigocaetanooficial)
