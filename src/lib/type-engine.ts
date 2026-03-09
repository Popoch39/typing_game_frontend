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
      for (const ch of prevWord.chars) {
        if (ch.typed === null && ch.status === "incorrect") {
          ch.status = "idle";
          missedChars++;
        }
      }
      for (let i = 0; i < missedChars; i++) this.stats.undoIncorrect();

      const cursorPos =
        prevWord.extras.length > 0
          ? prevWord.chars.length + prevWord.extras.length
          : prevWord.chars.findIndex((ch) => ch.typed === null);
      this.currentWordIndex = prevIdx;
      this.currentCharIndex =
        cursorPos === -1 ? prevWord.chars.length : cursorPos;
      prevWord.isComplete = false;
      return;
    }

    const word = this.words[this.currentWordIndex];

    if (ci > word.chars.length) {
      word.extras.pop();
      this.stats.undoExtra();
    } else {
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
