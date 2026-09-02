# MotoShop Frontend Style Guide

When generating or modifying React components in this project, you MUST adhere to the following style rules:

## 1. Tech Stack
- Next.js 15 (App Router).
- Tailwind CSS v4.
- `lucide-react` for iconography.
- shadcn/ui primitives.

## 2. State Management
- Use **Zustand** for local, client-side state (like the POS Cart or UI toggles). Do NOT use standard React Context unless absolutely required by a third-party library.
- Use **@tanstack/react-query** for all API data fetching, caching, and polling (like Saga event polling).

## 3. Design Aesthetics (The "WOW" Factor)
- Always use a Dark Mode default (`bg-zinc-950`).
- **Glassmorphism**: Utilize `bg-zinc-900/50 backdrop-blur-md` and subtle borders (`border-white/10`) for cards, modals, and headers.
- **Gradients**: Use vibrant text gradients for primary headers (e.g., `bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-500`).
- **Micro-animations**: Elements should respond to interaction. Use `transition-all`, `hover:scale-105`, `hover:border-cyan-500/50`, and subtle box shadows (`shadow-[0_0_15px_-3px_rgba(6,182,212,0.4)]`).
- Avoid generic colors like plain red or blue; use curated Tailwind hues like `cyan-500`, `zinc-900`, etc.
