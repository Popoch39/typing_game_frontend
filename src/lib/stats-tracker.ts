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
