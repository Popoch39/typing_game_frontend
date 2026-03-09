"use client";

import gsap from "gsap";
import { useEffect, useRef } from "react";
import { useWpm } from "@/stores/typing-store";

interface ResultsScreenProps {
  onRestart: () => void;
}

export function ResultsScreen({ onRestart }: ResultsScreenProps) {
  const { wpm, rawWpm, accuracy } = useWpm();

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

    // Count-up animations
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
        <span ref={wpmRef} className="result-value-big">
          0
        </span>
      </div>
      <div className="result-item">
        <span className="result-label">acc</span>
        <span ref={accuracyRef} className="result-value">
          0%
        </span>
      </div>
      <div className="result-item">
        <span className="result-label">raw</span>
        <span ref={rawWpmRef} className="result-value">
          0
        </span>
      </div>
      <div className="result-item">
        <button type="button" className="restart-btn" onClick={onRestart}>
          Tab + Enter to restart
        </button>
      </div>
    </div>
  );
}
