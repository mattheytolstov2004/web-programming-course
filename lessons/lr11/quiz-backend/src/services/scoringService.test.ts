import { describe, it, expect } from "vitest";
import { scoringService } from "./scoringService.js";

describe("scoreMultipleSelect", () => {
  it("adds +1 for correct answers", () => {
    const result = scoringService.scoreMultipleSelect(
      ["A", "C", "D"],
      ["A", "C"]
    );
    expect(result).toBe(2);
  });

  it("subtracts -0.5 for wrong answers", () => {
    const result = scoringService.scoreMultipleSelect(
      ["A", "C", "D"],
      ["B"]
    );
    expect(result).toBe(0); // -0.5 → min 0
  });

  it("mixed correct and incorrect", () => {
    const result = scoringService.scoreMultipleSelect(
      ["A", "C", "D"],
      ["A", "B", "C"]
    );
    expect(result).toBe(1.5);
  });

  it("returns 0 if all wrong", () => {
    const result = scoringService.scoreMultipleSelect(
      ["A"],
      ["B", "C"]
    );
    expect(result).toBe(0);
  });

  it("returns 0 if empty answers", () => {
    const result = scoringService.scoreMultipleSelect(
      ["A"],
      []
    );
    expect(result).toBe(0);
  });
});

describe("scoreEssay", () => {
  it("sums grades correctly", () => {
    const result = scoringService.scoreEssay(
      [3, 4],
      [5, 5]
    );
    expect(result).toBe(7);
  });

  it("returns 0 if all zero", () => {
    const result = scoringService.scoreEssay(
      [0, 0],
      [5, 5]
    );
    expect(result).toBe(0);
  });

  it("throws if length mismatch", () => {
    expect(() =>
      scoringService.scoreEssay([3], [5, 5])
    ).toThrow();
  });

  it("throws if grade exceeds rubric", () => {
    expect(() =>
      scoringService.scoreEssay([6], [5])
    ).toThrow();
  });

  it("works with single criterion", () => {
    const result = scoringService.scoreEssay(
      [4],
      [5]
    );
    expect(result).toBe(4);
  });
});