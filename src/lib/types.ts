export type CharStatus = "idle" | "correct" | "incorrect" | "extra";
export type TimeDuration = 15 | 30 | 60;
export type TestPhase = "waiting" | "running" | "finished";

export interface CharState {
  expected: string;
  typed: string | null;
  status: CharStatus;
}

export interface WordState {
  chars: CharState[];
  extras: string[];
  isComplete: boolean;
}

export interface TypingState {
  phase: TestPhase;
  duration: TimeDuration;
  words: WordState[];
  currentWordIndex: number;
  currentCharIndex: number;
  correctChars: number;
  incorrectChars: number;
  extraChars: number;
  totalKeystrokes: number;
}

export interface StatsSnapshot {
  correctChars: number;
  incorrectChars: number;
  extraChars: number;
  totalKeystrokes: number;
  wpm: number;
  rawWpm: number;
  accuracy: number;
}
