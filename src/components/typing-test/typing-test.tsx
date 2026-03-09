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
  const startTimer = useTypingStore((s) => s.startTimer);
  const restart = useTypingStore((s) => s.restart);
  const tick = useTypingStore((s) => s.tick);
  const setIsTyping = useTypingStore((s) => s.setIsTyping);

  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const tabPressedRef = useRef(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Timer interval
  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => {
      tick();
    }, 1000);
    return () => clearInterval(id);
  }, [isRunning, tick]);

  const handleRestart = useCallback(() => {
    restart();
    tabPressedRef.current = false;
  }, [restart]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Tab+Enter restart combo
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

      // Read phase from store directly to avoid stale closure
      const currentPhase = useTypingStore.getState().phase;

      if (currentPhase === "finished") return;

      // Mark as typing for caret blink
      setIsTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
      }, 500);

      // Start test on first keypress
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

  // Focus management — click wrapper to refocus
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
