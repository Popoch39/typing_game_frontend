import { describe, it, expect } from "vitest";
import { TypeEngine } from "./type-engine";

function createEngine(words: string[] = ["hello", "world"]) {
  return new TypeEngine(30, words);
}

describe("TypeEngine", () => {
  describe("initialization", () => {
    it("creates words from input", () => {
      const e = createEngine(["abc"]);
      expect(e.words.length).toBe(1);
      expect(e.words[0].chars.map((c) => c.expected).join("")).toBe("abc");
    });

    it("starts in waiting phase", () => {
      const e = createEngine();
      expect(e.phase).toBe("waiting");
    });

    it("cursor at 0,0", () => {
      const e = createEngine();
      expect(e.currentWordIndex).toBe(0);
      expect(e.currentCharIndex).toBe(0);
    });
  });

  describe("typeChar", () => {
    it("types correct char", () => {
      const e = createEngine(["hi"]);
      e.typeChar("h");
      expect(e.words[0].chars[0].status).toBe("correct");
      expect(e.words[0].chars[0].typed).toBe("h");
      expect(e.currentCharIndex).toBe(1);
      expect(e.stats.correctChars).toBe(1);
    });

    it("types incorrect char", () => {
      const e = createEngine(["hi"]);
      e.typeChar("x");
      expect(e.words[0].chars[0].status).toBe("incorrect");
      expect(e.stats.incorrectChars).toBe(1);
    });

    it("adds extra chars beyond word length", () => {
      const e = createEngine(["ab"]);
      e.typeChar("a");
      e.typeChar("b");
      e.typeChar("z");
      expect(e.words[0].extras).toEqual(["z"]);
      expect(e.stats.extraChars).toBe(1);
    });

    it("does nothing when finished", () => {
      const e = createEngine(["hi"]);
      e.finish();
      e.typeChar("h");
      expect(e.currentCharIndex).toBe(0);
    });
  });

  describe("backspace", () => {
    it("removes last typed char", () => {
      const e = createEngine(["hi"]);
      e.typeChar("h");
      e.backspace();
      expect(e.words[0].chars[0].status).toBe("idle");
      expect(e.words[0].chars[0].typed).toBeNull();
      expect(e.currentCharIndex).toBe(0);
    });

    it("undoes correct stat", () => {
      const e = createEngine(["hi"]);
      e.typeChar("h");
      e.backspace();
      expect(e.stats.correctChars).toBe(0);
    });

    it("undoes incorrect stat", () => {
      const e = createEngine(["hi"]);
      e.typeChar("x");
      e.backspace();
      expect(e.stats.incorrectChars).toBe(0);
    });

    it("removes extra char", () => {
      const e = createEngine(["a"]);
      e.typeChar("a");
      e.typeChar("z");
      e.backspace();
      expect(e.words[0].extras).toEqual([]);
      expect(e.stats.extraChars).toBe(0);
    });

    it("does nothing at start of first word", () => {
      const e = createEngine(["hi"]);
      e.backspace();
      expect(e.currentCharIndex).toBe(0);
      expect(e.currentWordIndex).toBe(0);
    });

    it("goes back to previous word with errors", () => {
      const e = createEngine(["ab", "cd"]);
      e.typeChar("x");
      e.nextWord();
      expect(e.currentWordIndex).toBe(1);
      e.backspace();
      expect(e.currentWordIndex).toBe(0);
    });

    it("does not go back to previous word without errors", () => {
      const e = createEngine(["ab", "cd"]);
      e.typeChar("a");
      e.typeChar("b");
      e.nextWord();
      e.backspace();
      expect(e.currentWordIndex).toBe(1);
    });
  });

  describe("ctrlBackspace", () => {
    it("clears entire current word", () => {
      const e = createEngine(["hello"]);
      e.typeChar("h");
      e.typeChar("e");
      e.typeChar("l");
      e.ctrlBackspace();
      expect(e.currentCharIndex).toBe(0);
      expect(e.words[0].chars.every((c) => c.status === "idle")).toBe(true);
    });

    it("adjusts stats correctly", () => {
      const e = createEngine(["hi"]);
      e.typeChar("h");
      e.typeChar("x");
      e.ctrlBackspace();
      expect(e.stats.correctChars).toBe(0);
      expect(e.stats.incorrectChars).toBe(0);
    });

    it("clears extras too", () => {
      const e = createEngine(["a"]);
      e.typeChar("a");
      e.typeChar("b");
      e.typeChar("c");
      e.ctrlBackspace();
      expect(e.words[0].extras).toEqual([]);
      expect(e.stats.extraChars).toBe(0);
    });
  });

  describe("nextWord", () => {
    it("moves to next word", () => {
      const e = createEngine(["ab", "cd"]);
      e.typeChar("a");
      e.typeChar("b");
      e.nextWord();
      expect(e.currentWordIndex).toBe(1);
      expect(e.currentCharIndex).toBe(0);
      expect(e.words[0].isComplete).toBe(true);
    });

    it("marks untyped chars as incorrect", () => {
      const e = createEngine(["abc", "d"]);
      e.typeChar("a");
      e.nextWord();
      expect(e.words[0].chars[1].status).toBe("incorrect");
      expect(e.words[0].chars[2].status).toBe("incorrect");
      expect(e.stats.incorrectChars).toBe(2);
    });

    it("does nothing if no chars typed", () => {
      const e = createEngine(["ab"]);
      e.nextWord();
      expect(e.currentWordIndex).toBe(0);
    });
  });

  describe("phase transitions", () => {
    it("start sets running", () => {
      const e = createEngine();
      e.start();
      expect(e.phase).toBe("running");
    });

    it("finish sets finished", () => {
      const e = createEngine();
      e.start();
      e.finish();
      expect(e.phase).toBe("finished");
    });
  });

  describe("reset", () => {
    it("resets to clean state with new words", () => {
      const e = createEngine(["ab"]);
      e.typeChar("a");
      e.start();
      e.reset(15, ["xy"]);
      expect(e.phase).toBe("waiting");
      expect(e.currentWordIndex).toBe(0);
      expect(e.currentCharIndex).toBe(0);
      expect(e.words[0].chars[0].expected).toBe("x");
      expect(e.stats.correctChars).toBe(0);
    });
  });

  describe("snapshot", () => {
    it("returns plain object with all state", () => {
      const e = createEngine(["hi"]);
      e.typeChar("h");
      const snap = e.snapshot();
      expect(snap.phase).toBe("waiting");
      expect(snap.currentWordIndex).toBe(0);
      expect(snap.currentCharIndex).toBe(1);
      expect(snap.correctChars).toBe(1);
      expect(snap.words).toBeDefined();
      expect(snap.words).not.toBe(e.words);
    });
  });
});
