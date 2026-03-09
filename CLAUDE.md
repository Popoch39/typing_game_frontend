# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- **Dev server:** `bun dev` (port 3000)
- **Build:** `bun run build` (standalone output)
- **Lint:** `bun run lint` (Biome check)
- **Format:** `bun run format` (Biome format --write)
- **Docker:** `docker compose up` (production build on port 3000)

## Tech Stack

- Next.js 16 (App Router, React Compiler enabled, standalone output)
- React 19 + Zustand for state management
- Tailwind CSS v4 (via PostCSS plugin)
- GSAP for animations (results screen only)
- Biome for linting/formatting (replaces ESLint + Prettier)
- Bun as package manager
- TypeScript with strict mode

## Architecture

MonkeyType-style typing test — single-page app with one route (`/`).

### State Management

Single Zustand store at `src/stores/typing-store.ts` — holds all typing state, timer state, UI state (isTyping), actions, and derived WPM/accuracy via `getWpm()`. Components subscribe to slices via selectors — no prop drilling. Timer interval lives in a `useEffect` in `typing-test.tsx`.

### Key Modules

- `src/stores/typing-store.ts` — Zustand store: all state + actions + derived stats
- `src/lib/types.ts` — shared types: `CharState`, `WordState`, `TypingState`, `TestPhase`, `TimeDuration`
- `src/lib/words.ts` — word pool + Fisher-Yates shuffle for generating random word lists
- `src/components/typing-test/typing-test.tsx` — orchestrator component, handles keyboard events via global `keydown` listener

### Conventions

- Path alias: `@/*` maps to `./src/*`
- Biome config: 2-space indent, recommended rules, auto-import organization
- All components are client components (`"use client"`)
- Fonts: Geist Sans + Geist Mono via `next/font/google`
