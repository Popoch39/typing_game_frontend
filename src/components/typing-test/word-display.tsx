"use client";

import { memo, type RefObject, useEffect, useRef, useState } from "react";
import type { WordState } from "@/lib/types";
import { useTypingStore } from "@/stores/typing-store";

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
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: extras are positional
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
            // biome-ignore lint/suspicious/noArrayIndexKey: words are index-stable during a test
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
