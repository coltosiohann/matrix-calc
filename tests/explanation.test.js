import test from "node:test";
import assert from "node:assert/strict";
import katex from "katex";
import {
  SEQUENCES,
  numericSequence,
  solveInverse,
  normalize,
} from "../src/math.js";
import {
  angleTrace,
  renderNumericalSteps,
} from "../src/inverse-explanation.js";

test("Displayed signed common-factor steps recover every branch for every sequence", () => {
  for (const sequence of SEQUENCES) {
    for (const angles of [
      [28, 38.47, 25],
      [-130, -40, 170],
      [179, 135, -175],
      [90, -89.99, -90],
    ]) {
      const matrix = numericSequence(sequence, angles);
      const result = solveInverse(sequence, matrix);
      for (const solution of result.solutions) {
        for (const [pair, index] of [
          [result.recipe.alpha, 0],
          [result.recipe.gamma, 2],
        ]) {
          const trace = angleTrace(
            pair,
            result.recipe.factor,
            solution.angles[1],
            matrix,
          );
          assert.ok(Number.isFinite(trace.denominator));
          assert.ok(
            Math.abs(normalize(trace.angle - solution.angles[index])) < 1e-9,
          );
          assert.ok(
            Math.abs(trace.x * trace.denominator - trace.numeratorX) < 1e-14,
          );
          assert.ok(
            Math.abs(trace.y * trace.denominator - trace.numeratorY) < 1e-14,
          );
        }
      }
    }
  }
});

test("Complete numeric steps are visible and end with evaluated angles", () => {
  const matrix = numericSequence("XYZ", [28, 38.47, 25]);
  const result = solveInverse("XYZ", matrix);
  result.solutions.forEach((_, index) => {
    const html = renderNumericalSteps(
      "XYZ",
      matrix,
      result,
      index,
      (latex) => latex,
    );
    assert.ok(!html.includes("<details"));
    assert.ok(html.includes("TRIPLETUL OBȚINUT"));
    assert.ok(html.includes("\\boxed{\\alpha"));
    assert.ok(html.includes("\\boxed{\\gamma"));
    assert.ok(!html.includes("NaN"));
  });
});

test("Singular explanation computes a representative without a zero division", () => {
  for (const sequence of SEQUENCES) {
    const beta = sequence[0] === sequence[2] ? 0 : 90;
    const matrix = numericSequence(sequence, [28, beta, 25]);
    const result = solveInverse(sequence, matrix);
    assert.ok(result.singular);
    const html = renderNumericalSteps(
      sequence,
      matrix,
      result,
      0,
      (latex) => latex,
    );
    assert.ok(html.includes("\\alpha=0^\\circ"));
    assert.ok(html.includes("TRIPLETUL OBȚINUT"));
    assert.ok(!/NaN|Infinity/.test(html));
  }
});

test("Every displayed equation renders correctly for regular and singular branches", () => {
  for (const sequence of SEQUENCES) {
    for (const beta of [38.47, -45, sequence[0] === sequence[2] ? 180 : -90]) {
      const matrix = numericSequence(sequence, [28, beta, 25]);
      const result = solveInverse(sequence, matrix);
      result.solutions.forEach((_, index) =>
        renderNumericalSteps(sequence, matrix, result, index, (latex) =>
          katex.renderToString(latex, { throwOnError: true }),
        ),
      );
    }
  }
});
