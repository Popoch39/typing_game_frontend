import { StatsTracker } from "./stats-tracker";
import type { TestPhase, TimeDuration, WordState } from "./types";

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

  /** Replace word reference so React.memo detects the change */
  private touchWord(idx: number): void {
    const w = this.words[idx];
    this.words[idx] = {
      chars: [...w.chars],
      extras: [...w.extras],
      isComplete: w.isComplete,
    };
  }

  typeChar(char: string): void {
    if (this.phase === "finished") return;
    const word = this.words[this.currentWordIndex];
    const ci = this.currentCharIndex;

    if (ci < word.chars.length) {
      const isCorrect = char === word.chars[ci].expected;
      word.chars[ci] = {
        ...word.chars[ci],
        typed: char,
        status: isCorrect ? "correct" : "incorrect",
      };
      if (isCorrect) this.stats.recordCorrect();
      else this.stats.recordIncorrect();
    } else {
      word.extras = [...word.extras, char];
      this.stats.recordExtra();
    }
    this.currentCharIndex++;
    this.touchWord(this.currentWordIndex);
  }

  backspace(): void {
    if (this.phase === "finished") return;
    const ci = this.currentCharIndex;

    if (ci === 0) {
      if (this.currentWordIndex === 0) return;
      const prevIdx = this.currentWordIndex - 1;
      const prevWord = this.words[prevIdx];
      if (!prevWord.isComplete) return;

      const hasErrors =
        prevWord.chars.some((ch) => ch.status === "incorrect") ||
        prevWord.extras.length > 0;
      if (!hasErrors) return;

      let missedChars = 0;
      const restoredChars = prevWord.chars.map((ch) => {
        if (ch.typed === null && ch.status === "incorrect") {
          missedChars++;
          return { ...ch, status: "idle" as const };
        }
        return ch;
      });
      for (let i = 0; i < missedChars; i++) this.stats.undoIncorrect();

      const cursorPos =
        prevWord.extras.length > 0
          ? prevWord.chars.length + prevWord.extras.length
          : restoredChars.findIndex((ch) => ch.typed === null);
      this.currentWordIndex = prevIdx;
      this.currentCharIndex =
        cursorPos === -1 ? prevWord.chars.length : cursorPos;
      this.words[prevIdx] = {
        chars: restoredChars,
        extras: prevWord.extras,
        isComplete: false,
      };
      return;
    }

    const word = this.words[this.currentWordIndex];

    if (ci > word.chars.length) {
      word.extras = word.extras.slice(0, -1);
      this.stats.undoExtra();
    } else {
      const prev = word.chars[ci - 1];
      if (prev.status === "correct") this.stats.undoCorrect();
      else this.stats.undoIncorrect();
      word.chars[ci - 1] = { ...prev, typed: null, status: "idle" };
    }
    this.currentCharIndex--;
    this.touchWord(this.currentWordIndex);
  }

  ctrlBackspace(): void {
    if (this.phase === "finished") return;
    const word = this.words[this.currentWordIndex];

    const newChars = word.chars.map((ch, i) => {
      if (i < this.currentCharIndex) {
        if (ch.status === "correct") this.stats.undoCorrect();
        else if (ch.status === "incorrect") this.stats.undoIncorrect();
        return { ...ch, typed: null, status: "idle" as const };
      }
      return ch;
    });
    for (let i = 0; i < word.extras.length; i++) this.stats.undoExtra();
    this.words[this.currentWordIndex] = {
      chars: newChars,
      extras: [],
      isComplete: false,
    };
    this.currentCharIndex = 0;
  }

  nextWord(): void {
    if (this.phase === "finished") return;
    if (this.currentCharIndex === 0) return;
    if (this.currentWordIndex >= this.words.length - 1) return;

    const word = this.words[this.currentWordIndex];
    const missedChars =
      word.chars.length - Math.min(this.currentCharIndex, word.chars.length);

    const newChars = word.chars.map((ch, i) => {
      if (i >= this.currentCharIndex && ch.status === "idle") {
        return { ...ch, status: "incorrect" as const };
      }
      return ch;
    });
    for (let i = 0; i < missedChars; i++) this.stats.recordIncorrect();

    this.words[this.currentWordIndex] = {
      chars: newChars,
      extras: word.extras,
      isComplete: true,
    };
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

  getWpm(elapsed: number): { wpm: number; rawWpm: number; accuracy: number } {
    return this.stats.getWpm(elapsed);
  }

  snapshot() {
    const statsSnap = this.stats.snapshot();
    return {
      phase: this.phase,
      duration: this.duration,
      words: this.words,
      currentWordIndex: this.currentWordIndex,
      currentCharIndex: this.currentCharIndex,
      ...statsSnap,
    };
  }
}
