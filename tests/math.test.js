import test from "node:test";
import assert from "node:assert/strict";
import {
  SEQUENCES,
  symbolicSequence,
  numericSequence,
  numericElementary,
  matrixError,
  inverseRecipe,
  solveInverse,
  atan2Document,
  validateMatrix,
  parseMatrix,
  parseNumber,
  rad,
  polynomialLatex,
} from "../src/math.js";

// Independent reference: compose unit quaternions, then convert to a matrix.
function quaternionMatrix(sequence, angles) {
  const product = (a, b) => [
    a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3],
    a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
    a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1],
    a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0],
  ];
  const [w, x, y, z] = [...sequence]
    .map((axis, i) => {
      const q = [Math.cos(rad(angles[i]) / 2), 0, 0, 0];
      q["XYZ".indexOf(axis) + 1] = Math.sin(rad(angles[i]) / 2);
      return q;
    })
    .reduce(product);
  return [
    [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
    [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
    [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)],
  ];
}
function evaluate(poly, angles) {
  return poly.reduce(
    (sum, t) =>
      sum +
      t.coefficient *
        t.factors.reduce((product, f) => {
          const [angle, kind] = f.split(":");
          return product * Math[kind](rad(angles[Number(angle)]));
        }, 1),
    0,
  );
}
let seed = 987654321;
const random = () => {
  seed = (1664525 * seed + 1013904223) >>> 0;
  return seed / 4294967296;
};
test("Document atan2 uses x first, handles all four quadrants", () => {
  for (const [x, y, angle] of [
    [1, 1, 45],
    [-1, 1, 135],
    [-1, -1, -135],
    [1, -1, -45],
    [0, 1, 90],
    [1, 0, 0],
  ])
    assert.ok(Math.abs(atan2Document(x, y) - angle) < 1e-12);
});
test("Elementaries obey positive right-hand rotations", () => {
  assert.ok(
    matrixError(numericElementary("X", 90), [
      [1, 0, 0],
      [0, 0, -1],
      [0, 1, 0],
    ]) < 1e-14,
  );
  assert.ok(
    matrixError(numericElementary("Y", 90), [
      [0, 0, 1],
      [0, 1, 0],
      [-1, 0, 0],
    ]) < 1e-14,
  );
  assert.ok(
    matrixError(numericElementary("Z", 90), [
      [0, -1, 0],
      [1, 0, 0],
      [0, 0, 1],
    ]) < 1e-14,
  );
});
for (const sequence of SEQUENCES) {
  test(`${sequence}: symbolic products and inverse branches agree with independent quaternion reference`, () => {
    const symbolic = symbolicSequence(sequence);
    inverseRecipe(sequence);
    for (let n = 0; n < 120; n++) {
      const angles = [
        random() * 720 - 360,
        random() * 340 - 170,
        random() * 720 - 360,
      ];
      const reference = quaternionMatrix(sequence, angles);
      assert.ok(
        matrixError(numericSequence(sequence, angles), reference) < 4e-15,
      );
      assert.ok(
        matrixError(
          symbolic.final.map((row) =>
            row.map((poly) => evaluate(poly, angles)),
          ),
          reference,
        ) < 4e-15,
      );
      const result = solveInverse(sequence, reference);
      assert.equal(result.singular, false);
      assert.equal(result.solutions.length, 2);
      result.solutions.forEach((s) =>
        assert.ok(
          s.error < 2e-12,
          `${sequence} ${angles}: residual ${s.error}`,
        ),
      );
    }
  });
  test(`${sequence}: exact and near singularities yield valid reconstructions`, () => {
    const proper = sequence[0] === sequence[2];
    const middles = proper
      ? [0, 180, -180, 1e-7, -1e-7, 179.9999999]
      : [90, -90, 89.9999999, -89.9999999];
    for (const beta of middles)
      for (const alpha of [-150, 0, 45, 179])
        for (const gamma of [-120, 0, 60, 170]) {
          const matrix = quaternionMatrix(sequence, [alpha, beta, gamma]);
          const result = solveInverse(sequence, matrix);
          result.solutions.forEach((s) =>
            assert.ok(
              s.error < 2e-7,
              `${sequence} ${alpha},${beta},${gamma}: ${s.error}`,
            ),
          );
          if ([0, 180, -180, 90, -90].includes(beta))
            assert.equal(result.singular, true);
        }
  });
}
test("YZY r13 includes the term missing in the PDF", () => {
  const r13 = symbolicSequence("YZY").final[0][2];
  assert.equal(r13.length, 2);
  const actual = evaluate(r13, [30, 45, 60]);
  assert.ok(
    Math.abs(
      actual -
        (Math.cos(rad(30)) * Math.cos(rad(45)) * Math.sin(rad(60)) +
          Math.sin(rad(30)) * Math.cos(rad(60))),
    ) < 1e-14,
  );
  assert.match(polynomialLatex(r13), /\\sin\(\\alpha\)/);
});
test("YZY recovers the example and the equivalent branch in the correct quadrants", () => {
  const result = solveInverse("YZY", quaternionMatrix("YZY", [30, 45, 60]));
  result.solutions[0].angles.forEach((value, i) =>
    assert.ok(Math.abs(value - [30, 45, 60][i]) < 1e-10),
  );
  result.solutions[1].angles.forEach((value, i) =>
    assert.ok(Math.abs(value - [-150, -45, -120][i]) < 1e-10),
  );
});
test("Rounded six-decimal rotation matrices are accepted", () => {
  for (const sequence of SEQUENCES) {
    const matrix = quaternionMatrix(sequence, [30, 45, 60]).map((row) =>
      row.map((v) => Number(v.toFixed(6))),
    );
    solveInverse(sequence, matrix).solutions.forEach((s) =>
      assert.ok(s.error < 2e-6),
    );
  }
});
test("Reflections, shears, zero matrices, scales and missing values are rejected", () => {
  for (const m of [
    [
      [-1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ],
    [
      [1, 0.01, 0],
      [0, 1, 0],
      [0, 0, 1],
    ],
    [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ],
    [
      [2, 0, 0],
      [0, 2, 0],
      [0, 0, 2],
    ],
    [
      [NaN, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ],
    [
      [Infinity, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ],
    [[1]],
  ])
    assert.throws(() => validateMatrix(m));
});
test("Pasting matrices supports whitespace, CSV, semicolons and decimal commas", () => {
  const identity = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  for (const value of [
    "1 0 0\n0 1 0\n0 0 1",
    "1,0,0;0,1,0;0,0,1",
    "[[1, 0, 0], [0, 1, 0], [0, 0, 1]]",
    "1,0 0,0 0,0\n0,0 1,0 0,0\n0,0 0,0 1,0",
  ])
    assert.deepEqual(parseMatrix(value), identity);
  assert.throws(() => parseMatrix("1 2 3"));
  assert.ok(Number.isNaN(parseNumber("")));
  assert.ok(Number.isNaN(parseNumber("0x10")));
  assert.equal(parseNumber("-0,125"), -0.125);
});
