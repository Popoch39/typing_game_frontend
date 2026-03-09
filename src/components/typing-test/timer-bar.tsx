"use client";

import type { TimeDuration } from "@/lib/types";
import { useTypingStore } from "@/stores/typing-store";

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
