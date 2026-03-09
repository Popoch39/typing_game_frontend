import { describe, it, expect } from "vitest";
import { StatsTracker } from "./stats-tracker";

describe("StatsTracker", () => {
  it("starts at zero", () => {
    const t = new StatsTracker();
    expect(t.correctChars).toBe(0);
    expect(t.incorrectChars).toBe(0);
    expect(t.extraChars).toBe(0);
    expect(t.totalKeystrokes).toBe(0);
  });

  it("records correct chars", () => {
    const t = new StatsTracker();
    t.recordCorrect();
    t.recordCorrect();
    expect(t.correctChars).toBe(2);
    expect(t.totalKeystrokes).toBe(2);
  });

  it("records incorrect chars", () => {
    const t = new StatsTracker();
    t.recordIncorrect();
    expect(t.incorrectChars).toBe(1);
    expect(t.totalKeystrokes).toBe(1);
  });

  it("records extra chars", () => {
    const t = new StatsTracker();
    t.recordExtra();
    expect(t.extraChars).toBe(1);
    expect(t.totalKeystrokes).toBe(1);
  });

  it("undoes correct", () => {
    const t = new StatsTracker();
    t.recordCorrect();
    t.undoCorrect();
    expect(t.correctChars).toBe(0);
  });

  it("undoes incorrect", () => {
    const t = new StatsTracker();
    t.recordIncorrect();
    t.undoIncorrect();
    expect(t.incorrectChars).toBe(0);
  });

  it("undoes extra", () => {
    const t = new StatsTracker();
    t.recordExtra();
    t.undoExtra();
    expect(t.extraChars).toBe(0);
  });

  it("computes WPM correctly", () => {
    const t = new StatsTracker();
    for (let i = 0; i < 50; i++) t.recordCorrect();
    const snap = t.getWpm(30);
    expect(snap.wpm).toBe(20);
  });

  it("computes rawWpm including errors", () => {
    const t = new StatsTracker();
    for (let i = 0; i < 40; i++) t.recordCorrect();
    for (let i = 0; i < 10; i++) t.recordIncorrect();
    const snap = t.getWpm(30);
    expect(snap.rawWpm).toBe(20);
    expect(snap.wpm).toBe(16);
  });

  it("computes accuracy", () => {
    const t = new StatsTracker();
    for (let i = 0; i < 8; i++) t.recordCorrect();
    for (let i = 0; i < 2; i++) t.recordIncorrect();
    const snap = t.getWpm(30);
    expect(snap.accuracy).toBe(80);
  });

  it("returns zeros when elapsed is 0", () => {
    const t = new StatsTracker();
    t.recordCorrect();
    const snap = t.getWpm(0);
    expect(snap.wpm).toBe(0);
    expect(snap.rawWpm).toBe(0);
    expect(snap.accuracy).toBe(100);
  });

  it("resets all counters", () => {
    const t = new StatsTracker();
    t.recordCorrect();
    t.recordIncorrect();
    t.recordExtra();
    t.reset();
    expect(t.correctChars).toBe(0);
    expect(t.incorrectChars).toBe(0);
    expect(t.extraChars).toBe(0);
    expect(t.totalKeystrokes).toBe(0);
  });

  it("snapshot returns plain object", () => {
    const t = new StatsTracker();
    t.recordCorrect();
    const snap = t.snapshot();
    expect(snap).toEqual({
      correctChars: 1,
      incorrectChars: 0,
      extraChars: 0,
      totalKeystrokes: 1,
    });
  });
});
