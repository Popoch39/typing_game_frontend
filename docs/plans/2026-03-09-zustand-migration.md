# Zustand Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate all state management (typing engine, timer, WPM) from useReducer/hooks to a single Zustand store.

**Architecture:** One Zustand store holds TypingState + timer state + derived WPM. Actions are methods on the store. Timer interval stays in a useEffect in TypingTest (Zustand = synchronous). Components subscribe to slices via selectors — no prop drilling.

**Tech Stack:** Zustand 5, React 19, Next.js 16, TypeScript strict

---

### Task 1: Install Zustand

**Step 1: Install**

Run: `bun add zustand`

**Step 2: Verify**

Run: `bun run build`
Expected: PASS (no code changes yet)

**Step 3: Commit**

```bash
git add package.json bun.lock
git commit -m "chore: add zustand dependency"
```

---

### Task 2: Create the Zustand store

**Files:**
- Create: `src/stores/typing-store.ts`

**Step 1: Create the store**

```ts
import { create } from "zustand";
import type { TimeDuration, TypingState, WordState } from "@/lib/types";
import { generateWords } from "@/lib/words";

const WORD_COUNT = 200;

function createWordState(word: string): WordState {
  return {
    chars: word.split("").map((ch) => ({
      expected: ch,
      typed: null,
      status: "idle" as const,
    })),
    extras: [],
    isComplete: false,
  };
}

function createInitialTypingState(duration: TimeDuration): TypingState {
  return {
    phase: "waiting",
    duration,
    words: generateWords(WORD_COUNT).map(createWordState),
    currentWordIndex: 0,
    currentCharIndex: 0,
    correctChars: 0,
    incorrectChars: 0,
    extraChars: 0,
    totalKeystrokes: 0,
  };
}

interface TypingStore extends TypingState {
  // Timer state
  timeLeft: number;
  isRunning: boolean;
  isTyping: boolean;

  // Typing actions
  typeChar: (char: string) => void;
  backspace: () => void;
  ctrlBackspace: () => void;
  nextWord: () => void;
  start: () => void;
  finish: () => void;
  restart: () => void;
  setDuration: (duration: TimeDuration) => void;

  // Timer actions
  startTimer: () => void;
  tick: () => void;
  resetTimer: (duration: TimeDuration) => void;

  // UI actions
  setIsTyping: (v: boolean) => void;

  // Derived (computed on read)
  getWpm: () => { wpm: number; rawWpm: number; accuracy: number };
}

export const useTypingStore = create<TypingStore>((set, get) => ({
  // Initial typing state
  ...createInitialTypingState(30),

  // Initial timer state
  timeLeft: 30,
  isRunning: false,
  isTyping: false,

  // --- Typing actions ---

  typeChar: (char) =>
    set((s) => {
      if (s.phase === "finished") return s;
      const word = s.words[s.currentWordIndex];
      const charIndex = s.currentCharIndex;
      const newWords = [...s.words];
      const newWord = {
        ...word,
        chars: [...word.chars],
        extras: [...word.extras],
      };

      if (charIndex < word.chars.length) {
        const expected = word.chars[charIndex].expected;
        const isCorrect = char === expected;
        newWord.chars[charIndex] = {
          expected,
          typed: char,
          status: isCorrect ? "correct" : "incorrect",
        };
        newWords[s.currentWordIndex] = newWord;
        return {
          words: newWords,
          currentCharIndex: charIndex + 1,
          correctChars: s.correctChars + (isCorrect ? 1 : 0),
          incorrectChars: s.incorrectChars + (isCorrect ? 0 : 1),
          totalKeystrokes: s.totalKeystrokes + 1,
        };
      }
      // Extra chars
      newWord.extras.push(char);
      newWords[s.currentWordIndex] = newWord;
      return {
        words: newWords,
        currentCharIndex: charIndex + 1,
        extraChars: s.extraChars + 1,
        totalKeystrokes: s.totalKeystrokes + 1,
      };
    }),

  backspace: () =>
    set((s) => {
      if (s.phase === "finished") return s;
      const word = s.words[s.currentWordIndex];
      const charIndex = s.currentCharIndex;

      // Go back to previous word
      if (charIndex === 0) {
        if (s.currentWordIndex === 0) return s;
        const prevIdx = s.currentWordIndex - 1;
        const prevWord = s.words[prevIdx];
        if (!prevWord.isComplete) return s;

        const hasErrors =
          prevWord.chars.some((ch) => ch.status === "incorrect") ||
          prevWord.extras.length > 0;
        if (!hasErrors) return s;

        const newWords = [...s.words];
        let missedChars = 0;
        const restoredChars = prevWord.chars.map((ch) => {
          if (ch.typed === null && ch.status === "incorrect") {
            missedChars++;
            return { ...ch, status: "idle" as const };
          }
          return ch;
        });

        const prevCharIndex =
          prevWord.extras.length > 0
            ? prevWord.chars.length + prevWord.extras.length
            : restoredChars.findIndex((ch) => ch.typed === null);
        const cursorPos =
          prevCharIndex === -1 ? prevWord.chars.length : prevCharIndex;

        newWords[prevIdx] = {
          ...prevWord,
          chars: restoredChars,
          isComplete: false,
        };

        return {
          words: newWords,
          currentWordIndex: prevIdx,
          currentCharIndex: cursorPos,
          incorrectChars: s.incorrectChars - missedChars,
        };
      }

      const newWords = [...s.words];
      const newWord = {
        ...word,
        chars: [...word.chars],
        extras: [...word.extras],
      };

      if (charIndex > word.chars.length) {
        newWord.extras.pop();
        newWords[s.currentWordIndex] = newWord;
        return {
          words: newWords,
          currentCharIndex: charIndex - 1,
          extraChars: s.extraChars - 1,
        };
      }
      const prev = word.chars[charIndex - 1];
      const wasCorrect = prev.status === "correct";
      newWord.chars[charIndex - 1] = {
        expected: prev.expected,
        typed: null,
        status: "idle",
      };
      newWords[s.currentWordIndex] = newWord;
      return {
        words: newWords,
        currentCharIndex: charIndex - 1,
        correctChars: s.correctChars - (wasCorrect ? 1 : 0),
        incorrectChars: s.incorrectChars - (wasCorrect ? 0 : 1),
      };
    }),

  ctrlBackspace: () =>
    set((s) => {
      if (s.phase === "finished") return s;
      const word = s.words[s.currentWordIndex];
      const newWords = [...s.words];
      let removedCorrect = 0;
      let removedIncorrect = 0;
      for (
        let i = 0;
        i < s.currentCharIndex && i < word.chars.length;
        i++
      ) {
        if (word.chars[i].status === "correct") removedCorrect++;
        else if (word.chars[i].status === "incorrect") removedIncorrect++;
      }
      const removedExtras = word.extras.length;

      newWords[s.currentWordIndex] = {
        chars: word.chars.map((ch) => ({
          expected: ch.expected,
          typed: null,
          status: "idle" as const,
        })),
        extras: [],
        isComplete: false,
      };
      return {
        words: newWords,
        currentCharIndex: 0,
        correctChars: s.correctChars - removedCorrect,
        incorrectChars: s.incorrectChars - removedIncorrect,
        extraChars: s.extraChars - removedExtras,
      };
    }),

  nextWord: () =>
    set((s) => {
      if (s.phase === "finished") return s;
      if (s.currentCharIndex === 0) return s;

      const word = s.words[s.currentWordIndex];
      const newWords = [...s.words];
      const newChars = word.chars.map((ch, i) => {
        if (i >= s.currentCharIndex && ch.status === "idle") {
          return { ...ch, status: "incorrect" as const };
        }
        return ch;
      });
      const missedChars =
        word.chars.length -
        Math.min(s.currentCharIndex, word.chars.length);
      newWords[s.currentWordIndex] = {
        ...word,
        chars: newChars,
        isComplete: true,
      };

      return {
        words: newWords,
        currentWordIndex: s.currentWordIndex + 1,
        currentCharIndex: 0,
        incorrectChars: s.incorrectChars + missedChars,
      };
    }),

  start: () => set({ phase: "running" }),

  finish: () => set({ phase: "finished", isRunning: false }),

  restart: () =>
    set((s) => ({
      ...createInitialTypingState(s.duration),
      timeLeft: s.duration,
      isRunning: false,
      isTyping: false,
    })),

  setDuration: (duration) =>
    set({
      ...createInitialTypingState(duration),
      timeLeft: duration,
      isRunning: false,
      isTyping: false,
    }),

  // --- Timer actions ---

  startTimer: () => set({ isRunning: true }),

  tick: () =>
    set((s) => {
      if (!s.isRunning) return s;
      if (s.timeLeft <= 1) {
        return { timeLeft: 0, isRunning: false, phase: "finished" };
      }
      return { timeLeft: s.timeLeft - 1 };
    }),

  resetTimer: (duration) => set({ timeLeft: duration, isRunning: false }),

  // --- UI actions ---

  setIsTyping: (v) => set({ isTyping: v }),

  // --- Derived ---

  getWpm: () => {
    const s = get();
    const elapsed = s.duration - s.timeLeft;
    if (elapsed === 0) return { wpm: 0, rawWpm: 0, accuracy: 100 };

    const minutes = elapsed / 60;
    const wpm = Math.round(s.correctChars / 5 / minutes);
    const rawWpm = Math.round(
      (s.correctChars + s.incorrectChars + s.extraChars) / 5 / minutes,
    );
    const accuracy =
      s.totalKeystrokes === 0
        ? 100
        : Math.round((s.correctChars / s.totalKeystrokes) * 100);

    return { wpm, rawWpm, accuracy };
  },
}));
```

**Step 2: Verify build**

Run: `bun run build`
Expected: PASS (store not consumed yet)

**Step 3: Commit**

```bash
git add src/stores/typing-store.ts
git commit -m "feat: create Zustand typing store"
```

---

### Task 3: Migrate TypingTest component to use store

**Files:**
- Modify: `src/components/typing-test/typing-test.tsx`

**Step 1: Rewrite TypingTest to use the store**

```tsx
"use client";

import { useCallback, useEffect, useRef } from "react";
import { useTypingStore } from "@/stores/typing-store";
import { LiveStats } from "./live-stats";
import { ResultsScreen } from "./results-screen";
import { TimerBar } from "./timer-bar";
import { WordDisplay } from "./word-display";

export function TypingTest() {
  const phase = useTypingStore((s) => s.phase);
  const isRunning = useTypingStore((s) => s.isRunning);

  const typeChar = useTypingStore((s) => s.typeChar);
  const backspace = useTypingStore((s) => s.backspace);
  const ctrlBackspace = useTypingStore((s) => s.ctrlBackspace);
  const nextWord = useTypingStore((s) => s.nextWord);
  const start = useTypingStore((s) => s.start);
  const restart = useTypingStore((s) => s.restart);
  const startTimer = useTypingStore((s) => s.startTimer);
  const tick = useTypingStore((s) => s.tick);
  const setIsTyping = useTypingStore((s) => s.setIsTyping);

  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const tabPressedRef = useRef(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Timer interval
  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => tick(), 1000);
    return () => clearInterval(id);
  }, [isRunning, tick]);

  const handleRestart = useCallback(() => {
    restart();
    tabPressedRef.current = false;
  }, [restart]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        e.preventDefault();
        tabPressedRef.current = true;
        return;
      }
      if (e.key === "Enter" && tabPressedRef.current) {
        e.preventDefault();
        tabPressedRef.current = false;
        handleRestart();
        return;
      }
      if (e.key !== "Tab") {
        tabPressedRef.current = false;
      }

      const currentPhase = useTypingStore.getState().phase;
      if (currentPhase === "finished") return;

      setIsTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 500);

      if (
        currentPhase === "waiting" &&
        e.key.length === 1 &&
        !e.ctrlKey &&
        !e.metaKey
      ) {
        start();
        startTimer();
      }

      if (e.key === "Backspace") {
        e.preventDefault();
        if (e.ctrlKey) {
          ctrlBackspace();
        } else {
          backspace();
        }
        return;
      }

      if (e.key === " ") {
        e.preventDefault();
        nextWord();
        return;
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        typeChar(e.key);
      }
    },
    [
      start,
      startTimer,
      typeChar,
      backspace,
      ctrlBackspace,
      nextWord,
      handleRestart,
      setIsTyping,
    ],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    wrapperRef.current?.focus();
  }, []);

  return (
    <div ref={wrapperRef} className="typing-test" tabIndex={-1}>
      <TimerBar />
      {phase !== "finished" ? (
        <>
          <WordDisplay containerRef={containerRef} />
          {phase === "running" && <LiveStats />}
        </>
      ) : (
        <ResultsScreen onRestart={handleRestart} />
      )}
    </div>
  );
}
```

Note: `handleKeyDown` reads `phase` via `useTypingStore.getState()` to avoid stale closure — no ref needed.

**Step 2: Verify build (will fail until child components are updated)**

Skip build for now, continue to Task 4.

---

### Task 4: Migrate child components to use store

**Files:**
- Modify: `src/components/typing-test/timer-bar.tsx`
- Modify: `src/components/typing-test/live-stats.tsx`
- Modify: `src/components/typing-test/results-screen.tsx`
- Modify: `src/components/typing-test/word-display.tsx`

**Step 1: Rewrite TimerBar**

```tsx
"use client";

import { useTypingStore } from "@/stores/typing-store";
import type { TimeDuration } from "@/lib/types";

const durations: TimeDuration[] = [15, 30, 60];

export function TimerBar() {
  const phase = useTypingStore((s) => s.phase);
  const duration = useTypingStore((s) => s.duration);
  const timeLeft = useTypingStore((s) => s.timeLeft);
  const setDuration = useTypingStore((s) => s.setDuration);

  if (phase === "running") {
    return <div className="timer-countdown">{timeLeft}</div>;
  }

  if (phase === "waiting") {
    return (
      <div className="timer-pills">
        {durations.map((d) => (
          <button
            key={d}
            type="button"
            className={`timer-pill ${d === duration ? "active" : ""}`}
            onClick={() => setDuration(d)}
          >
            {d}
          </button>
        ))}
      </div>
    );
  }

  return null;
}
```

**Step 2: Rewrite LiveStats**

```tsx
"use client";

import { useTypingStore } from "@/stores/typing-store";

export function LiveStats() {
  const { wpm, accuracy } = useTypingStore((s) => s.getWpm());

  return (
    <div className="live-stats">
      <div className="stat">
        <span className="stat-value">{wpm}</span>
        <span className="stat-label">wpm</span>
      </div>
      <div className="stat">
        <span className="stat-value">{accuracy}%</span>
        <span className="stat-label">acc</span>
      </div>
    </div>
  );
}
```

**Step 3: Rewrite ResultsScreen**

Remove props except `onRestart`. Read wpm/rawWpm/accuracy from store.

```tsx
"use client";

import gsap from "gsap";
import { useEffect, useRef } from "react";
import { useTypingStore } from "@/stores/typing-store";

interface ResultsScreenProps {
  onRestart: () => void;
}

export function ResultsScreen({ onRestart }: ResultsScreenProps) {
  const { wpm, rawWpm, accuracy } = useTypingStore((s) => s.getWpm());
  const containerRef = useRef<HTMLDivElement>(null);
  const wpmRef = useRef<HTMLSpanElement>(null);
  const rawWpmRef = useRef<HTMLSpanElement>(null);
  const accuracyRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const items = container.querySelectorAll(".result-item");

    gsap.from(items, {
      y: 20,
      opacity: 0,
      stagger: 0.15,
      duration: 0.5,
      ease: "power2.out",
    });

    const countUp = (
      ref: React.RefObject<HTMLSpanElement | null>,
      target: number,
      suffix = "",
    ) => {
      const obj = { val: 0 };
      gsap.to(obj, {
        val: target,
        duration: 1,
        ease: "power2.out",
        onUpdate: () => {
          if (ref.current) {
            ref.current.textContent = `${Math.round(obj.val)}${suffix}`;
          }
        },
      });
    };

    countUp(wpmRef, wpm);
    countUp(rawWpmRef, rawWpm);
    countUp(accuracyRef, accuracy, "%");
  }, [wpm, rawWpm, accuracy]);

  return (
    <div ref={containerRef} className="results-screen">
      <div className="result-item result-main">
        <span className="result-label">wpm</span>
        <span ref={wpmRef} className="result-value-big">0</span>
      </div>
      <div className="result-item">
        <span className="result-label">acc</span>
        <span ref={accuracyRef} className="result-value">0%</span>
      </div>
      <div className="result-item">
        <span className="result-label">raw</span>
        <span ref={rawWpmRef} className="result-value">0</span>
      </div>
      <div className="result-item">
        <button type="button" className="restart-btn" onClick={onRestart}>
          Tab + Enter to restart
        </button>
      </div>
    </div>
  );
}
```

**Step 4: Rewrite WordDisplay**

Remove props except `containerRef`. Read from store.

```tsx
"use client";

import { type RefObject, memo, useEffect, useRef, useState } from "react";
import { useTypingStore } from "@/stores/typing-store";
import type { WordState } from "@/lib/types";

interface WordDisplayProps {
  containerRef: RefObject<HTMLDivElement | null>;
}

const LINE_HEIGHT = 40;
const VISIBLE_LINES = 3;

interface WordProps {
  word: WordState;
  wordIdx: number;
  charRefs: Map<string, HTMLSpanElement>;
}

const Word = memo(function Word({ word, wordIdx, charRefs }: WordProps) {
  const setRef = (idx: number) => (el: HTMLSpanElement | null) => {
    const key = `${wordIdx}-${idx}`;
    if (el) charRefs.set(key, el);
    else charRefs.delete(key);
  };

  return (
    <span className="word">
      {word.chars.map((char, charIdx) => (
        <span
          key={`${char.expected}-${charIdx}`}
          ref={setRef(charIdx)}
          className={`char ${char.status}`}
        >
          {char.expected}
        </span>
      ))}
      {word.extras.map((extra, extraIdx) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: extras are positional
        <span
          key={`extra-${extraIdx}`}
          ref={setRef(word.chars.length + extraIdx)}
          className="char extra"
        >
          {extra}
        </span>
      ))}
      <span> </span>
    </span>
  );
});

export function WordDisplay({ containerRef }: WordDisplayProps) {
  const words = useTypingStore((s) => s.words);
  const currentWordIndex = useTypingStore((s) => s.currentWordIndex);
  const currentCharIndex = useTypingStore((s) => s.currentCharIndex);
  const isTyping = useTypingStore((s) => s.isTyping);

  const wordsInnerRef = useRef<HTMLDivElement>(null);
  const caretRef = useRef<HTMLDivElement>(null);
  const charRefs = useRef<Map<string, HTMLSpanElement>>(new Map());
  const [lineOffset, setLineOffset] = useState(0);
  const rafId = useRef(0);

  // Update caret position via rAF + CSS transition
  // biome-ignore lint/correctness/useExhaustiveDependencies: lineOffset triggers caret recalc after scroll
  useEffect(() => {
    cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(() => {
      const container = wordsInnerRef.current;
      if (!container) return;

      const word = words[currentWordIndex];
      if (!word) return;

      let targetEl: HTMLSpanElement | undefined;
      const totalChars = word.chars.length + word.extras.length;

      if (currentCharIndex < word.chars.length) {
        targetEl = charRefs.current.get(
          `${currentWordIndex}-${currentCharIndex}`,
        );
      } else if (currentCharIndex > 0) {
        const lastIdx = Math.min(currentCharIndex - 1, totalChars - 1);
        targetEl = charRefs.current.get(`${currentWordIndex}-${lastIdx}`);
      }

      if (!targetEl || !caretRef.current) return;

      const containerRect = container.getBoundingClientRect();
      const charRect = targetEl.getBoundingClientRect();

      let x: number;
      if (currentCharIndex <= 0 || currentCharIndex <= word.chars.length - 1) {
        x = charRect.left - containerRect.left;
      } else {
        x = charRect.right - containerRect.left;
      }
      const y = charRect.top - containerRect.top;

      caretRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      caretRef.current.style.height = `${charRect.height}px`;
    });
  }, [currentWordIndex, currentCharIndex, words, lineOffset]);

  // Track line offset for scrolling
  // biome-ignore lint/correctness/useExhaustiveDependencies: lineOffset needed to recalculate after scroll shift
  useEffect(() => {
    const container = wordsInnerRef.current;
    if (!container) return;

    const currentCharEl = charRefs.current.get(`${currentWordIndex}-0`);
    if (!currentCharEl) return;

    const containerRect = container.getBoundingClientRect();
    const charRect = currentCharEl.getBoundingClientRect();
    const relativeTop =
      charRect.top - containerRect.top + lineOffset * LINE_HEIGHT;
    const currentLine = Math.floor(relativeTop / LINE_HEIGHT);

    if (currentLine >= 2) {
      setLineOffset(currentLine - 1);
    }
  }, [currentWordIndex, lineOffset]);

  return (
    <div
      ref={containerRef}
      className="word-display-container"
      style={{ height: VISIBLE_LINES * LINE_HEIGHT, overflow: "hidden" }}
    >
      <div
        ref={wordsInnerRef}
        className="word-display-inner"
        style={{
          position: "relative",
          transform: `translate3d(0, -${lineOffset * LINE_HEIGHT}px, 0)`,
          transition: "transform 0.2s cubic-bezier(0.22, 1, 0.36, 1)",
          willChange: "transform",
        }}
      >
        <div ref={caretRef} className={`caret ${isTyping ? "typing" : ""}`} />
        {words.map((word, wordIdx) => (
          <Word
            key={wordIdx}
            word={word}
            wordIdx={wordIdx}
            charRefs={charRefs.current}
          />
        ))}
      </div>
    </div>
  );
}
```

**Step 5: Verify build**

Run: `bun run build`
Expected: PASS

**Step 6: Commit**

```bash
git add src/components/typing-test/
git commit -m "feat: migrate all components to Zustand store"
```

---

### Task 5: Delete old hooks and clean up types

**Files:**
- Delete: `src/hooks/use-typing-engine.ts`
- Delete: `src/hooks/use-timer.ts`
- Delete: `src/hooks/use-wpm.ts`
- Modify: `src/lib/types.ts` (remove `TypingAction`)

**Step 1: Delete old hook files**

```bash
rm src/hooks/use-typing-engine.ts src/hooks/use-timer.ts src/hooks/use-wpm.ts
```

**Step 2: Remove TypingAction from types.ts**

Remove the `TypingAction` type union — no longer needed with Zustand methods.

**Step 3: Verify build**

Run: `bun run build`
Expected: PASS

**Step 4: Lint**

Run: `bun run lint`
Expected: PASS

**Step 5: Commit**

```bash
git add -A
git commit -m "refactor: remove old useReducer hooks and TypingAction type"
```

---

### Task 6: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Update tech stack and architecture sections**

- Tech stack: replace useReducer mention with Zustand
- State management: describe the Zustand store at `src/stores/typing-store.ts`
- Key modules: remove deleted hooks, add store

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md for Zustand migration"
```

---

### Task 7: Manual verification

**Step 1:** Run `bun dev`, open localhost:3000
**Step 2:** Type rapidly — verify caret movement, WPM counter, accuracy
**Step 3:** Let timer run out — verify results screen with GSAP animations
**Step 4:** Tab+Enter restart — verify clean reset
**Step 5:** Switch duration (15/30/60) — verify timer resets
**Step 6:** Verify line scrolling when typing past line 2
