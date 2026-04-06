import { describe, it, expect } from "vitest";
import { scoringService } from "./scoringService.js";

describe("scoreMultipleSelect", () => {
  it("adds +1 for correct answers", () => {
    const result = scoringService.scoreMultipleSelect(["A", "C", "D"], ["A", "C"]);
    expect(result).toBe(2);
  });
  it("subtracts -0.5 for wrong answers", () => {
    const result = scoringService.scoreMultipleSelect(["A", "C", "D"], ["B"]);
    expect(result).toBe(0);
  });
  it("mixed correct and incorrect", () => {
    const result = scoringService.scoreMultipleSelect(["A", "C", "D"], ["A", "B", "C"]);
    expect(result).toBe(1.5);
  });
  it("returns 0 if all wrong", () => {
    const result = scoringService.scoreMultipleSelect(["A"], ["B", "C"]);
    expect(result).toBe(0);
  });
  it("returns 0 if empty answers", () => {
    const result = scoringService.scoreMultipleSelect(["A"], []);
    expect(result).toBe(0);
  });
});

describe("scoreEssay", () => {
  it("sums grades correctly", () => {
    const result = scoringService.scoreEssay(
      [{ criterion: "clarity", points: 3 }, { criterion: "depth", points: 4 }],
      [{ criterion: "clarity", maxPoints: 5 }, { criterion: "depth", maxPoints: 5 }]
    );
    expect(result).toBe(7);
  });
  it("returns 0 if all zero", () => {
    const result = scoringService.scoreEssay(
      [{ criterion: "clarity", points: 0 }, { criterion: "depth", points: 0 }],
      [{ criterion: "clarity", maxPoints: 5 }, { criterion: "depth", maxPoints: 5 }]
    );
    expect(result).toBe(0);
  });
  it("caps grade at rubric max", () => {
    const result = scoringService.scoreEssay(
      [{ criterion: "clarity", points: 6 }],
      [{ criterion: "clarity", maxPoints: 5 }]
    );
    expect(result).toBe(5);
  });
  it("skips unknown criterion", () => {
    const result = scoringService.scoreEssay(
      [{ criterion: "unknown", points: 3 }],
      [{ criterion: "clarity", maxPoints: 5 }]
    );
    expect(result).toBe(0);
  });
  it("works with single criterion", () => {
    const result = scoringService.scoreEssay(
      [{ criterion: "clarity", points: 4 }],
      [{ criterion: "clarity", maxPoints: 5 }]
    );
    expect(result).toBe(4);
  });
});