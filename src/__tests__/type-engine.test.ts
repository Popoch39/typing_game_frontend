import { describe, expect, it } from "vitest";
import { TypeEngine } from "@/lib/type-engine";

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

    it("does nothing on last word", () => {
      const e = createEngine(["only"]);
      e.typeChar("o");
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
      // snapshot returns same array ref (perf: avoids deep clone)
      // but mutated words get new object refs via touchWord()
      expect(snap.words).toBe(e.words);
    });

    it("includes duration in snapshot", () => {
      const e = createEngine(["hi"]);
      const snap = e.snapshot();
      expect(snap.duration).toBe(30);
    });
  });

  describe("getWpm", () => {
    it("delegates to stats tracker", () => {
      const e = createEngine(["hello"]);
      for (const ch of "hello") e.typeChar(ch);
      const result = e.getWpm(60);
      expect(result.wpm).toBe(1);
      expect(result.accuracy).toBe(100);
    });
  });

  describe("backspace edge cases", () => {
    it("goes back to previous word with extras and places cursor after extras", () => {
      const e = createEngine(["ab", "cd"]);
      e.typeChar("a");
      e.typeChar("b");
      e.typeChar("z"); // extra
      e.nextWord();
      expect(e.currentWordIndex).toBe(1);
      e.backspace();
      expect(e.currentWordIndex).toBe(0);
      expect(e.currentCharIndex).toBe(3); // chars.length + extras.length
    });

    it("does not go back to non-complete previous word", () => {
      const e = createEngine(["ab", "cd"]);
      // Move to word 1 without completing word 0
      e.typeChar("x");
      e.nextWord();
      // Now at word 1, word 0 is complete with errors
      // Go back to word 0
      e.backspace();
      expect(e.currentWordIndex).toBe(0);
      // Try to go back further — word 0 is not complete now
      e.currentCharIndex = 0;
      e.backspace();
      expect(e.currentWordIndex).toBe(0);
    });

    it("does nothing when finished", () => {
      const e = createEngine(["hi"]);
      e.typeChar("h");
      e.finish();
      e.backspace();
      expect(e.currentCharIndex).toBe(1);
    });

    it("does not go back to incomplete previous word (defensive)", () => {
      const e = createEngine(["ab", "cd", "ef"]);
      e.typeChar("a");
      e.typeChar("b");
      e.nextWord();
      // Manually mark word 0 as incomplete to test the defensive guard
      e.words[0].isComplete = false;
      e.backspace();
      expect(e.currentWordIndex).toBe(1);
    });

    it("places cursor at end of word when all chars typed with errors", () => {
      const e = createEngine(["ab", "cd"]);
      e.typeChar("x"); // incorrect
      e.typeChar("b"); // correct — all chars typed, no extras
      e.nextWord();
      e.backspace();
      expect(e.currentWordIndex).toBe(0);
      // findIndex returns -1, so cursorPos should be chars.length
      expect(e.currentCharIndex).toBe(2);
    });
  });

  describe("ctrlBackspace edge cases", () => {
    it("does nothing when finished", () => {
      const e = createEngine(["hi"]);
      e.typeChar("h");
      e.finish();
      e.ctrlBackspace();
      expect(e.currentCharIndex).toBe(1);
    });

    it("skips idle chars within range (defensive)", () => {
      const e = createEngine(["abc"]);
      e.typeChar("a");
      e.typeChar("b");
      // Manually set char 0 to idle to test the else branch
      e.words[0].chars[0] = { ...e.words[0].chars[0], status: "idle" as const };
      e.ctrlBackspace();
      expect(e.currentCharIndex).toBe(0);
      // Only 1 undoCorrect (for char 1) since char 0 is idle
    });

    it("only clears chars up to currentCharIndex, leaving rest idle", () => {
      const e = createEngine(["hello"]);
      e.typeChar("h");
      e.typeChar("e");
      // currentCharIndex is 2, chars 2-4 are still idle
      e.ctrlBackspace();
      expect(e.currentCharIndex).toBe(0);
      expect(e.words[0].chars[0].status).toBe("idle");
      expect(e.words[0].chars[1].status).toBe("idle");
      expect(e.words[0].chars[2].status).toBe("idle"); // was already idle
    });
  });

  describe("nextWord edge cases", () => {
    it("does nothing when finished", () => {
      const e = createEngine(["ab", "cd"]);
      e.typeChar("a");
      e.finish();
      e.nextWord();
      expect(e.currentWordIndex).toBe(0);
    });
  });
});
