import { describe, it, expect } from "vitest";
import { ScoringService } from "./scoringService.js";

const service = new ScoringService();

describe("ScoringService unit tests", () => {
  describe("multiple select scoring", () => {
    it("all correct answers gives max points", () => {
      expect(service.scoreMultipleSelect(
        ["a", "b", "c"], 
        ["a", "b", "c"]
      )).toBe(3);
    });

    it("one right + many wrongs doesn't go negative", () => {
      expect(service.scoreMultipleSelect(
        ["a"], 
        ["a", "b", "c", "d"]
      )).toBe(0);
    });

    it("partially correct with penalty", () => {
      expect(service.scoreMultipleSelect(
        ["a", "b", "c"], 
        ["a", "d"]
      )).toBe(0.5);
    });
  });

  describe("essay scoring", () => {
    const rubric = [
      { criterion: "structure", maxPoints: 3 },
      { criterion: "content", maxPoints: 5 },
    ];

    it("points above max should be capped", () => {
      expect(service.scoreEssay(
        [{ criterion: "content", points: 10 }], 
        rubric
      )).toBe(5);
    });

    it("unknown criteria should be ignored", () => {
      expect(service.scoreEssay(
        [{ criterion: "unknown", points: 5 }], 
        rubric
      )).toBe(0);
    });
  });
});