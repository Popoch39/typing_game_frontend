"use client";

import { useWpm } from "@/stores/typing-store";

export function LiveStats() {
  const { wpm, accuracy } = useWpm();

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
