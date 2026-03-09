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
  return engine.stats.getWpm(elapsed);
}

export function useWpm() {
  return useTypingStore(useShallow(selectWpm));
}
