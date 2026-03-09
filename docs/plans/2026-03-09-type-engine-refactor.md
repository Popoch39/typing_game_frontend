# TypeEngine + StatsTracker Refactor

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extract typing logic and stats from Zustand store into testable `TypeEngine` and `StatsTracker` classes.

**Architecture:** `StatsTracker` owns counters + WPM calc. `TypeEngine` owns words/cursor/phase and holds a `StatsTracker`. Both mutate internal state. Zustand store becomes a thin wrapper that calls engine methods then `set(engine.snapshot())`. Timer stays in store.

**Tech Stack:** Vitest (bun-compatible, fast), TypeScript strict mode.

---

### Task 1: Add Vitest

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`

**Step 1: Install vitest**

Run: `bun add -d vitest`

**Step 2: Create vitest config**

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

**Step 3: Add test script to package.json**

Add `"test": "vitest run"` and `"test:watch": "vitest"` to scripts.

**Step 4: Verify vitest runs**

Run: `bun run test`
Expected: "No test files found" (no error)

**Step 5: Commit**

```bash
git add vitest.config.ts package.json bun.lock
git commit -m "chore: add vitest for unit testing"
```

---

### Task 2: StatsTracker — tests + implementation

**Files:**
- Create: `src/lib/stats-tracker.ts`
- Create: `src/lib/stats-tracker.test.ts`
- Modify: `src/lib/types.ts` (add `StatsSnapshot`)

**Step 1: Add StatsSnapshot type**

In `src/lib/types.ts`, add:

```ts
export interface StatsSnapshot {
  correctChars: number;
  incorrectChars: number;
  extraChars: number;
  totalKeystrokes: number;
  wpm: number;
  rawWpm: number;
  accuracy: number;
}
```

**Step 2: Write failing tests**

```ts
// src/lib/stats-tracker.test.ts
import { describe, it, expect } from "vitest";
import { StatsTracker } from "./stats-tracker";

describe("StatsTracker", () => {
  it("starts at zero", () => {
    const t = new StatsTracker();
    expect(t.correctChars).toBe(0);
    expect(t.incorrectChars).toBe(0);
    expect(t.extraChars).toBe(0);
    expect(t.totalKeystrokes).toBe(0);
  });

  it("records correct chars", () => {
    const t = new StatsTracker();
    t.recordCorrect();
    t.recordCorrect();
    expect(t.correctChars).toBe(2);
    expect(t.totalKeystrokes).toBe(2);
  });

  it("records incorrect chars", () => {
    const t = new StatsTracker();
    t.recordIncorrect();
    expect(t.incorrectChars).toBe(1);
    expect(t.totalKeystrokes).toBe(1);
  });

  it("records extra chars", () => {
    const t = new StatsTracker();
    t.recordExtra();
    expect(t.extraChars).toBe(1);
    expect(t.totalKeystrokes).toBe(1);
  });

  it("undoes correct", () => {
    const t = new StatsTracker();
    t.recordCorrect();
    t.undoCorrect();
    expect(t.correctChars).toBe(0);
  });

  it("undoes incorrect", () => {
    const t = new StatsTracker();
    t.recordIncorrect();
    t.undoIncorrect();
    expect(t.incorrectChars).toBe(0);
  });

  it("undoes extra", () => {
    const t = new StatsTracker();
    t.recordExtra();
    t.undoExtra();
    expect(t.extraChars).toBe(0);
  });

  it("computes WPM correctly", () => {
    const t = new StatsTracker();
    // 50 correct chars in 30 seconds = 50/5 / 0.5 = 20 WPM
    for (let i = 0; i < 50; i++) t.recordCorrect();
    const snap = t.getWpm(30);
    expect(snap.wpm).toBe(20);
  });

  it("computes rawWpm including errors", () => {
    const t = new StatsTracker();
    for (let i = 0; i < 40; i++) t.recordCorrect();
    for (let i = 0; i < 10; i++) t.recordIncorrect();
    const snap = t.getWpm(30);
    expect(snap.rawWpm).toBe(20); // 50/5 / 0.5
    expect(snap.wpm).toBe(16);   // 40/5 / 0.5
  });

  it("computes accuracy", () => {
    const t = new StatsTracker();
    for (let i = 0; i < 8; i++) t.recordCorrect();
    for (let i = 0; i < 2; i++) t.recordIncorrect();
    const snap = t.getWpm(30);
    expect(snap.accuracy).toBe(80);
  });

  it("returns zeros when elapsed is 0", () => {
    const t = new StatsTracker();
    t.recordCorrect();
    const snap = t.getWpm(0);
    expect(snap.wpm).toBe(0);
    expect(snap.rawWpm).toBe(0);
    expect(snap.accuracy).toBe(100);
  });

  it("resets all counters", () => {
    const t = new StatsTracker();
    t.recordCorrect();
    t.recordIncorrect();
    t.recordExtra();
    t.reset();
    expect(t.correctChars).toBe(0);
    expect(t.incorrectChars).toBe(0);
    expect(t.extraChars).toBe(0);
    expect(t.totalKeystrokes).toBe(0);
  });

  it("snapshot returns plain object", () => {
    const t = new StatsTracker();
    t.recordCorrect();
    const snap = t.snapshot();
    expect(snap).toEqual({
      correctChars: 1,
      incorrectChars: 0,
      extraChars: 0,
      totalKeystrokes: 1,
    });
  });
});
```

**Step 3: Run tests to verify they fail**

Run: `bun run test`
Expected: FAIL — cannot import StatsTracker

**Step 4: Implement StatsTracker**

```ts
// src/lib/stats-tracker.ts
export class StatsTracker {
  correctChars = 0;
  incorrectChars = 0;
  extraChars = 0;
  totalKeystrokes = 0;

  recordCorrect(): void {
    this.correctChars++;
    this.totalKeystrokes++;
  }

  recordIncorrect(): void {
    this.incorrectChars++;
    this.totalKeystrokes++;
  }

  recordExtra(): void {
    this.extraChars++;
    this.totalKeystrokes++;
  }

  undoCorrect(): void {
    this.correctChars--;
  }

  undoIncorrect(): void {
    this.incorrectChars--;
  }

  undoExtra(): void {
    this.extraChars--;
  }

  getWpm(elapsed: number): { wpm: number; rawWpm: number; accuracy: number } {
    if (elapsed === 0) return { wpm: 0, rawWpm: 0, accuracy: 100 };
    const minutes = elapsed / 60;
    const wpm = Math.round(this.correctChars / 5 / minutes);
    const rawWpm = Math.round(
      (this.correctChars + this.incorrectChars + this.extraChars) / 5 / minutes,
    );
    const accuracy =
      this.totalKeystrokes === 0
        ? 100
        : Math.round((this.correctChars / this.totalKeystrokes) * 100);
    return { wpm, rawWpm, accuracy };
  }

  snapshot() {
    return {
      correctChars: this.correctChars,
      incorrectChars: this.incorrectChars,
      extraChars: this.extraChars,
      totalKeystrokes: this.totalKeystrokes,
    };
  }

  reset(): void {
    this.correctChars = 0;
    this.incorrectChars = 0;
    this.extraChars = 0;
    this.totalKeystrokes = 0;
  }
}
```

**Step 5: Run tests**

Run: `bun run test`
Expected: All 12 tests PASS

**Step 6: Commit**

```bash
git add src/lib/stats-tracker.ts src/lib/stats-tracker.test.ts src/lib/types.ts
git commit -m "feat: add StatsTracker class with full test coverage"
```

---

### Task 3: TypeEngine — tests + implementation

**Files:**
- Create: `src/lib/type-engine.ts`
- Create: `src/lib/type-engine.test.ts`

**Step 1: Write failing tests**

```ts
// src/lib/type-engine.test.ts
import { describe, it, expect } from "vitest";
import { TypeEngine } from "./type-engine";

// Helper: create engine with known words instead of random
function createEngine(words: string[] = ["hello", "world"]) {
  return new TypeEngine(30, words);
}

describe("TypeEngine", () => {
  describe("initialization", () => {
    it("creates words from input", () => {
      const e = createEngine(["abc"]);
      expect(e.words.length).toBe(1);
      expect(e.words[0].chars.map((c) => c.expected).join("")).toBe("abc");
    });

    it("starts in waiting phase", () => {
      const e = createEngine();
      expect(e.phase).toBe("waiting");
    });

    it("cursor at 0,0", () => {
      const e = createEngine();
      expect(e.currentWordIndex).toBe(0);
      expect(e.currentCharIndex).toBe(0);
    });
  });

  describe("typeChar", () => {
    it("types correct char", () => {
      const e = createEngine(["hi"]);
      e.typeChar("h");
      expect(e.words[0].chars[0].status).toBe("correct");
      expect(e.words[0].chars[0].typed).toBe("h");
      expect(e.currentCharIndex).toBe(1);
      expect(e.stats.correctChars).toBe(1);
    });

    it("types incorrect char", () => {
      const e = createEngine(["hi"]);
      e.typeChar("x");
      expect(e.words[0].chars[0].status).toBe("incorrect");
      expect(e.stats.incorrectChars).toBe(1);
    });

    it("adds extra chars beyond word length", () => {
      const e = createEngine(["ab"]);
      e.typeChar("a");
      e.typeChar("b");
      e.typeChar("z");
      expect(e.words[0].extras).toEqual(["z"]);
      expect(e.stats.extraChars).toBe(1);
    });

    it("does nothing when finished", () => {
      const e = createEngine(["hi"]);
      e.finish();
      e.typeChar("h");
      expect(e.currentCharIndex).toBe(0);
    });
  });

  describe("backspace", () => {
    it("removes last typed char", () => {
      const e = createEngine(["hi"]);
      e.typeChar("h");
      e.backspace();
      expect(e.words[0].chars[0].status).toBe("idle");
      expect(e.words[0].chars[0].typed).toBeNull();
      expect(e.currentCharIndex).toBe(0);
    });

    it("undoes correct stat", () => {
      const e = createEngine(["hi"]);
      e.typeChar("h");
      e.backspace();
      expect(e.stats.correctChars).toBe(0);
    });

    it("undoes incorrect stat", () => {
      const e = createEngine(["hi"]);
      e.typeChar("x");
      e.backspace();
      expect(e.stats.incorrectChars).toBe(0);
    });

    it("removes extra char", () => {
      const e = createEngine(["a"]);
      e.typeChar("a");
      e.typeChar("z");
      e.backspace();
      expect(e.words[0].extras).toEqual([]);
      expect(e.stats.extraChars).toBe(0);
    });

    it("does nothing at start of first word", () => {
      const e = createEngine(["hi"]);
      e.backspace();
      expect(e.currentCharIndex).toBe(0);
      expect(e.currentWordIndex).toBe(0);
    });

    it("goes back to previous word with errors", () => {
      const e = createEngine(["ab", "cd"]);
      e.typeChar("x"); // wrong
      e.nextWord();
      expect(e.currentWordIndex).toBe(1);
      e.backspace();
      expect(e.currentWordIndex).toBe(0);
    });

    it("does not go back to previous word without errors", () => {
      const e = createEngine(["ab", "cd"]);
      e.typeChar("a");
      e.typeChar("b");
      e.nextWord();
      e.backspace();
      expect(e.currentWordIndex).toBe(1);
    });
  });

  describe("ctrlBackspace", () => {
    it("clears entire current word", () => {
      const e = createEngine(["hello"]);
      e.typeChar("h");
      e.typeChar("e");
      e.typeChar("l");
      e.ctrlBackspace();
      expect(e.currentCharIndex).toBe(0);
      expect(e.words[0].chars.every((c) => c.status === "idle")).toBe(true);
    });

    it("adjusts stats correctly", () => {
      const e = createEngine(["hi"]);
      e.typeChar("h"); // correct
      e.typeChar("x"); // incorrect
      e.ctrlBackspace();
      expect(e.stats.correctChars).toBe(0);
      expect(e.stats.incorrectChars).toBe(0);
    });

    it("clears extras too", () => {
      const e = createEngine(["a"]);
      e.typeChar("a");
      e.typeChar("b");
      e.typeChar("c");
      e.ctrlBackspace();
      expect(e.words[0].extras).toEqual([]);
      expect(e.stats.extraChars).toBe(0);
    });
  });

  describe("nextWord", () => {
    it("moves to next word", () => {
      const e = createEngine(["ab", "cd"]);
      e.typeChar("a");
      e.typeChar("b");
      e.nextWord();
      expect(e.currentWordIndex).toBe(1);
      expect(e.currentCharIndex).toBe(0);
      expect(e.words[0].isComplete).toBe(true);
    });

    it("marks untyped chars as incorrect", () => {
      const e = createEngine(["abc", "d"]);
      e.typeChar("a");
      e.nextWord();
      expect(e.words[0].chars[1].status).toBe("incorrect");
      expect(e.words[0].chars[2].status).toBe("incorrect");
      expect(e.stats.incorrectChars).toBe(2);
    });

    it("does nothing if no chars typed", () => {
      const e = createEngine(["ab"]);
      e.nextWord();
      expect(e.currentWordIndex).toBe(0);
    });
  });

  describe("phase transitions", () => {
    it("start sets running", () => {
      const e = createEngine();
      e.start();
      expect(e.phase).toBe("running");
    });

    it("finish sets finished", () => {
      const e = createEngine();
      e.start();
      e.finish();
      expect(e.phase).toBe("finished");
    });
  });

  describe("reset", () => {
    it("resets to clean state with new words", () => {
      const e = createEngine(["ab"]);
      e.typeChar("a");
      e.start();
      e.reset(15, ["xy"]);
      expect(e.phase).toBe("waiting");
      expect(e.currentWordIndex).toBe(0);
      expect(e.currentCharIndex).toBe(0);
      expect(e.words[0].chars[0].expected).toBe("x");
      expect(e.stats.correctChars).toBe(0);
    });
  });

  describe("snapshot", () => {
    it("returns plain object with all state", () => {
      const e = createEngine(["hi"]);
      e.typeChar("h");
      const snap = e.snapshot();
      expect(snap.phase).toBe("waiting");
      expect(snap.currentWordIndex).toBe(0);
      expect(snap.currentCharIndex).toBe(1);
      expect(snap.correctChars).toBe(1);
      expect(snap.words).toBeDefined();
      expect(snap.words).not.toBe(e.words); // should be a copy
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `bun run test`
Expected: FAIL — cannot import TypeEngine

**Step 3: Implement TypeEngine**

```ts
// src/lib/type-engine.ts
import type { TestPhase, TimeDuration, WordState } from "./types";
import { StatsTracker } from "./stats-tracker";

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

export class TypeEngine {
  phase: TestPhase = "waiting";
  duration: TimeDuration;
  words: WordState[];
  currentWordIndex = 0;
  currentCharIndex = 0;
  stats: StatsTracker;

  constructor(duration: TimeDuration, words: string[]) {
    this.duration = duration;
    this.words = words.map(createWordState);
    this.stats = new StatsTracker();
  }

  typeChar(char: string): void {
    if (this.phase === "finished") return;
    const word = this.words[this.currentWordIndex];
    const ci = this.currentCharIndex;

    if (ci < word.chars.length) {
      const isCorrect = char === word.chars[ci].expected;
      word.chars[ci].typed = char;
      word.chars[ci].status = isCorrect ? "correct" : "incorrect";
      if (isCorrect) this.stats.recordCorrect();
      else this.stats.recordIncorrect();
    } else {
      word.extras.push(char);
      this.stats.recordExtra();
    }
    this.currentCharIndex++;
  }

  backspace(): void {
    if (this.phase === "finished") return;
    const ci = this.currentCharIndex;

    // Go back to previous word
    if (ci === 0) {
      if (this.currentWordIndex === 0) return;
      const prevIdx = this.currentWordIndex - 1;
      const prevWord = this.words[prevIdx];
      if (!prevWord.isComplete) return;

      const hasErrors =
        prevWord.chars.some((ch) => ch.status === "incorrect") ||
        prevWord.extras.length > 0;
      if (!hasErrors) return;

      // Restore missed chars (marked incorrect on nextWord but never typed)
      let missedChars = 0;
      for (const ch of prevWord.chars) {
        if (ch.typed === null && ch.status === "incorrect") {
          ch.status = "idle";
          missedChars++;
        }
      }
      for (let i = 0; i < missedChars; i++) this.stats.undoIncorrect();

      // Cursor position: after last typed char or after extras
      const cursorPos =
        prevWord.extras.length > 0
          ? prevWord.chars.length + prevWord.extras.length
          : prevWord.chars.findIndex((ch) => ch.typed === null);
      this.currentWordIndex = prevIdx;
      this.currentCharIndex = cursorPos === -1 ? prevWord.chars.length : cursorPos;
      prevWord.isComplete = false;
      return;
    }

    const word = this.words[this.currentWordIndex];

    if (ci > word.chars.length) {
      // Remove extra char
      word.extras.pop();
      this.stats.undoExtra();
    } else {
      // Remove typed char
      const prev = word.chars[ci - 1];
      if (prev.status === "correct") this.stats.undoCorrect();
      else this.stats.undoIncorrect();
      prev.typed = null;
      prev.status = "idle";
    }
    this.currentCharIndex--;
  }

  ctrlBackspace(): void {
    if (this.phase === "finished") return;
    const word = this.words[this.currentWordIndex];

    for (let i = 0; i < this.currentCharIndex && i < word.chars.length; i++) {
      if (word.chars[i].status === "correct") this.stats.undoCorrect();
      else if (word.chars[i].status === "incorrect") this.stats.undoIncorrect();
      word.chars[i].typed = null;
      word.chars[i].status = "idle";
    }
    for (let i = 0; i < word.extras.length; i++) this.stats.undoExtra();
    word.extras.length = 0;
    word.isComplete = false;
    this.currentCharIndex = 0;
  }

  nextWord(): void {
    if (this.phase === "finished") return;
    if (this.currentCharIndex === 0) return;

    const word = this.words[this.currentWordIndex];
    const missedChars =
      word.chars.length - Math.min(this.currentCharIndex, word.chars.length);

    for (let i = this.currentCharIndex; i < word.chars.length; i++) {
      if (word.chars[i].status === "idle") {
        word.chars[i].status = "incorrect";
      }
    }
    for (let i = 0; i < missedChars; i++) this.stats.recordIncorrect();

    word.isComplete = true;
    this.currentWordIndex++;
    this.currentCharIndex = 0;
  }

  start(): void {
    this.phase = "running";
  }

  finish(): void {
    this.phase = "finished";
  }

  reset(duration: TimeDuration, words: string[]): void {
    this.phase = "waiting";
    this.duration = duration;
    this.words = words.map(createWordState);
    this.currentWordIndex = 0;
    this.currentCharIndex = 0;
    this.stats.reset();
  }

  snapshot() {
    const statsSnap = this.stats.snapshot();
    return {
      phase: this.phase,
      duration: this.duration,
      words: this.words.map((w) => ({
        chars: w.chars.map((c) => ({ ...c })),
        extras: [...w.extras],
        isComplete: w.isComplete,
      })),
      currentWordIndex: this.currentWordIndex,
      currentCharIndex: this.currentCharIndex,
      ...statsSnap,
    };
  }
}
```

**Step 4: Run tests**

Run: `bun run test`
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/lib/type-engine.ts src/lib/type-engine.test.ts
git commit -m "feat: add TypeEngine class with full test coverage"
```

---

### Task 4: Rewire Zustand store

**Files:**
- Modify: `src/stores/typing-store.ts`

**Step 1: Rewrite the store**

```ts
// src/stores/typing-store.ts
import { create } from "zustand";
import { useShallow } from "zustand/shallow";
import type { TestPhase, TimeDuration, WordState } from "@/lib/types";
import { TypeEngine } from "@/lib/type-engine";
import { generateWords } from "@/lib/words";

const WORD_COUNT = 200;
const DEFAULT_DURATION: TimeDuration = 30;

interface TypingStoreState {
  // Engine snapshot (reactive)
  phase: TestPhase;
  duration: TimeDuration;
  words: WordState[];
  currentWordIndex: number;
  currentCharIndex: number;
  correctChars: number;
  incorrectChars: number;
  extraChars: number;
  totalKeystrokes: number;

  // Timer state
  timeLeft: number;
  isRunning: boolean;

  // UI state
  isTyping: boolean;

  // Actions
  typeChar: (char: string) => void;
  backspace: () => void;
  ctrlBackspace: () => void;
  nextWord: () => void;
  start: () => void;
  finish: () => void;
  restart: () => void;
  setDuration: (duration: TimeDuration) => void;
  startTimer: () => void;
  tick: () => void;
  resetTimer: (duration: TimeDuration) => void;
  setIsTyping: (v: boolean) => void;
}

// Engine lives outside reactive state — mutated directly
let engine = new TypeEngine(DEFAULT_DURATION, generateWords(WORD_COUNT));

export const useTypingStore = create<TypingStoreState>((set, get) => ({
  ...engine.snapshot(),

  timeLeft: DEFAULT_DURATION,
  isRunning: false,
  isTyping: false,

  typeChar: (char: string) => {
    engine.typeChar(char);
    set(engine.snapshot());
  },

  backspace: () => {
    engine.backspace();
    set(engine.snapshot());
  },

  ctrlBackspace: () => {
    engine.ctrlBackspace();
    set(engine.snapshot());
  },

  nextWord: () => {
    engine.nextWord();
    set(engine.snapshot());
  },

  start: () => {
    engine.start();
    set({ phase: engine.phase });
  },

  finish: () => {
    engine.finish();
    set({ phase: engine.phase, isRunning: false });
  },

  restart: () => {
    engine.reset(get().duration, generateWords(WORD_COUNT));
    set({
      ...engine.snapshot(),
      timeLeft: get().duration,
      isRunning: false,
      isTyping: false,
    });
  },

  setDuration: (duration: TimeDuration) => {
    engine.reset(duration, generateWords(WORD_COUNT));
    set({
      ...engine.snapshot(),
      timeLeft: duration,
      isRunning: false,
      isTyping: false,
    });
  },

  startTimer: () => {
    if (get().isRunning) return;
    set({ isRunning: true });
  },

  tick: () => {
    set((s) => {
      if (s.timeLeft <= 1) {
        engine.finish();
        return { timeLeft: 0, phase: "finished", isRunning: false };
      }
      return { timeLeft: s.timeLeft - 1 };
    });
  },

  resetTimer: (duration: TimeDuration) => {
    set({ isRunning: false, timeLeft: duration });
  },

  setIsTyping: (v: boolean) => {
    set({ isTyping: v });
  },
}));

function selectWpm(s: TypingStoreState) {
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
}

export function useWpm() {
  return useTypingStore(useShallow(selectWpm));
}
```

**Step 2: Verify build**

Run: `bun run build`
Expected: Build succeeds with no errors

**Step 3: Run all tests**

Run: `bun run test`
Expected: All tests PASS

**Step 4: Manual smoke test**

Run: `bun dev` — type some words, verify timer, restart, duration switch all work.

**Step 5: Commit**

```bash
git add src/stores/typing-store.ts
git commit -m "refactor: rewire Zustand store to use TypeEngine + StatsTracker"
```

---

### Task 5: Cleanup

**Files:**
- Modify: `src/stores/typing-store.ts` — remove `selectWpm` function, use `engine.stats.getWpm()` instead

**Step 1: Replace selectWpm with engine stats**

Replace the `selectWpm` function and `useWpm` hook with:

```ts
function selectWpm(s: TypingStoreState) {
  const elapsed = s.duration - s.timeLeft;
  return engine.stats.getWpm(elapsed);
}
```

**Step 2: Run tests + build**

Run: `bun run test && bun run build`
Expected: All pass

**Step 3: Commit**

```bash
git add src/stores/typing-store.ts
git commit -m "refactor: use StatsTracker.getWpm in store selector"
```
