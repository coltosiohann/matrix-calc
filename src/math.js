// Polynomials are sums of signed products of explicit trigonometric factors.
// No shorthand symbols replace sin(alpha), cos(alpha), etc. in the output.
export const ANGLES = ["\\alpha", "\\beta", "\\gamma"];
export const SEQUENCES = [
  "XYX",
  "XYZ",
  "XZX",
  "XZY",
  "YXY",
  "YXZ",
  "YZX",
  "YZY",
  "ZXY",
  "ZXZ",
  "ZYX",
  "ZYZ",
];
const atom = (coefficient, ...factors) => [{ coefficient, factors }];
const zero = () => [];
const one = () => atom(1);
const trig = (kind, angle, sign = 1) => atom(sign, `${angle}:${kind}`);

function combine(terms) {
  const result = new Map();
  for (const term of terms) {
    const factors = [...term.factors].sort();
    const key = factors.join("|");
    if (!result.has(key)) result.set(key, { coefficient: 0, factors });
    result.get(key).coefficient += term.coefficient;
  }
  return [...result.values()].filter((t) => t.coefficient !== 0);
}
export function add(...polys) {
  return combine(polys.flat());
}
export function multiply(a, b) {
  return combine(
    a.flatMap((x) =>
      b.map((y) => ({
        coefficient: x.coefficient * y.coefficient,
        factors: [...x.factors, ...y.factors],
      })),
    ),
  );
}
export function symbolicElementary(axis, angle) {
  const c = () => trig("cos", angle);
  const s = (sign = 1) => trig("sin", angle, sign);
  if (axis === "X")
    return [
      [one(), zero(), zero()],
      [zero(), c(), s(-1)],
      [zero(), s(), c()],
    ];
  if (axis === "Y")
    return [
      [c(), zero(), s()],
      [zero(), one(), zero()],
      [s(-1), zero(), c()],
    ];
  if (axis === "Z")
    return [
      [c(), s(-1), zero()],
      [s(), c(), zero()],
      [zero(), zero(), one()],
    ];
  throw new Error("Axă necunoscută.");
}
export function symbolicMultiply(a, b) {
  return a.map((row) =>
    b[0].map((_, j) => add(...row.map((cell, k) => multiply(cell, b[k][j])))),
  );
}
export function symbolicSequence(sequence) {
  if (!SEQUENCES.includes(sequence))
    throw new Error("Alege o secvență validă de trei axe.");
  const elementary = [...sequence].map((axis, i) =>
    symbolicElementary(axis, i),
  );
  const intermediate = symbolicMultiply(elementary[0], elementary[1]);
  return {
    elementary,
    intermediate,
    final: symbolicMultiply(intermediate, elementary[2]),
  };
}
export function polynomialLatex(poly) {
  if (!poly.length) return "0";
  return poly
    .map((term, i) => {
      const sign = term.coefficient < 0 ? "-" : i ? "+" : "";
      const value = Math.abs(term.coefficient);
      const coefficient =
        value === 1 && term.factors.length ? "" : String(value);
      const factors = term.factors
        .map((f) => {
          const [a, kind] = f.split(":");
          return `\\${kind}(${ANGLES[Number(a)]})`;
        })
        .join("\\,");
      return sign + coefficient + factors;
    })
    .join(" ");
}
export function matrixLatex(matrix, formatter = polynomialLatex) {
  return `\\begin{pmatrix}${matrix.map((row) => row.map(formatter).join(" & ")).join(" \\\\ ")}\\end{pmatrix}`;
}
export function rawCellLatex(a, b, i, j) {
  return [0, 1, 2]
    .map(
      (k) =>
        `\\left(${polynomialLatex(a[i][k])}\\right)\\cdot\\left(${polynomialLatex(b[k][j])}\\right)`,
    )
    .join(" + ");
}
export const rad = (degrees) => (degrees * Math.PI) / 180;
export const deg = (radians) => (radians * 180) / Math.PI;
export function normalize(angle) {
  return ((((angle + 180) % 360) + 360) % 360) - 180;
}
export function numericElementary(axis, angle) {
  const c = Math.cos(rad(angle)),
    s = Math.sin(rad(angle));
  if (axis === "X")
    return [
      [1, 0, 0],
      [0, c, -s],
      [0, s, c],
    ];
  if (axis === "Y")
    return [
      [c, 0, s],
      [0, 1, 0],
      [-s, 0, c],
    ];
  return [
    [c, -s, 0],
    [s, c, 0],
    [0, 0, 1],
  ];
}
export const transpose = (matrix) =>
  matrix[0].map((_, j) => matrix.map((row) => row[j]));
export const numericMultiply = (a, b) =>
  a.map((row) =>
    b[0].map((_, j) => row.reduce((sum, x, k) => sum + x * b[k][j], 0)),
  );
export function numericSequence(sequence, angles) {
  return [...sequence]
    .map((axis, i) => numericElementary(axis, angles[i]))
    .reduce(numericMultiply);
}
export function determinant(m) {
  return (
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0])
  );
}
export const matrixError = (a, b) =>
  Math.max(...a.flatMap((row, i) => row.map((x, j) => Math.abs(x - b[i][j]))));
export function validateMatrix(m) {
  if (
    m.length !== 3 ||
    m.some((row) => row.length !== 3 || row.some((x) => !Number.isFinite(x)))
  )
    throw new Error("Completează toate cele 9 elemente cu numere finite.");
  const det = determinant(m);
  const identity = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  const orthogonality = matrixError(numericMultiply(transpose(m), m), identity);
  if (Math.abs(det - 1) > 0.00005 || orthogonality > 0.00005)
    throw new Error(
      `Matricea nu este o matrice de rotație: det(R) = ${formatNumber(det)}, abaterea de la ortogonalitate = ${formatNumber(orthogonality)}. Verifică valorile și folosește minimum 6 zecimale.`,
    );
  return { det, orthogonality };
}
// Document convention: first argument is x (cosine), second is y (sine).
// JavaScript uses the reverse order, so this wrapper is the ONLY atan2 entry point.
export function atan2Document(x, y) {
  return deg(Math.atan2(y, x));
}

export function inverseRecipe(sequence) {
  const matrix = symbolicSequence(sequence).final;
  const proper = sequence[0] === sequence[2];
  const betaKind = proper ? "cos" : "sin";
  let beta;
  matrix.forEach((row, i) =>
    row.forEach((p, j) => {
      if (p.length === 1 && p[0].factors.join() === `1:${betaKind}`)
        beta = { i, j, sign: p[0].coefficient };
    }),
  );
  const factor = proper ? "sin" : "cos";
  const locate = (angle, kind) => {
    let found;
    matrix.forEach((row, i) =>
      row.forEach((p, j) => {
        if (
          p.length === 1 &&
          p[0].factors.length === 2 &&
          p[0].factors.includes(`${angle}:${kind}`) &&
          p[0].factors.includes(`1:${factor}`)
        )
          found = { i, j, sign: p[0].coefficient };
      }),
    );
    if (!found) throw new Error("Nu s-a putut deriva formula inversă.");
    return found;
  };
  return {
    proper,
    betaKind,
    beta,
    factor,
    alpha: { cos: locate(0, "cos"), sin: locate(0, "sin") },
    gamma: { cos: locate(2, "cos"), sin: locate(2, "sin") },
  };
}
export function solveInverse(sequence, matrix) {
  const validation = validateMatrix(matrix);
  const recipe = inverseRecipe(sequence);
  const b = recipe.beta;
  const q = Math.max(-1, Math.min(1, b.sign * matrix[b.i][b.j]));
  // atan2 with the complementary entries preserves accuracy near singularities.
  const pair = recipe.alpha;
  const complementary = Math.hypot(
    matrix[pair.cos.i][pair.cos.j],
    matrix[pair.sin.i][pair.sin.j],
  );
  const firstBeta = recipe.proper
    ? atan2Document(q, complementary)
    : atan2Document(complementary, q);
  const singular = complementary < 1e-10;
  let solutions;
  if (singular) {
    const reduced = numericMultiply(
      transpose(numericElementary(sequence[1], firstBeta)),
      matrix,
    );
    const axis = sequence[2];
    const gamma =
      axis === "X"
        ? atan2Document(reduced[1][1], reduced[2][1])
        : axis === "Y"
          ? atan2Document(reduced[0][0], reduced[0][2])
          : atan2Document(reduced[0][0], reduced[1][0]);
    solutions = [{ angles: [0, firstBeta, normalize(gamma)] }];
  } else {
    const betas = [
      firstBeta,
      recipe.proper ? -firstBeta : normalize(180 - firstBeta),
    ];
    solutions = betas.map((beta) => {
      const divisor =
        recipe.factor === "sin" ? Math.sin(rad(beta)) : Math.cos(rad(beta));
      const getAngle = (pair) => {
        const x = (pair.cos.sign * matrix[pair.cos.i][pair.cos.j]) / divisor;
        const y = (pair.sin.sign * matrix[pair.sin.i][pair.sin.j]) / divisor;
        return normalize(atan2Document(x, y));
      };
      return { angles: [getAngle(recipe.alpha), beta, getAngle(recipe.gamma)] };
    });
  }
  for (const solution of solutions) {
    solution.reconstructed = numericSequence(sequence, solution.angles);
    solution.error = matrixError(matrix, solution.reconstructed);
  }
  return { recipe, validation, singular, solutions };
}
export function formatNumber(value, digits = 6) {
  if (Math.abs(value) < 0.5 * 10 ** -digits) return "0";
  return Number(value.toFixed(digits)).toString();
}
export function parseNumber(text) {
  const trimmed = String(text).trim().replace(",", ".");
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(trimmed))
    return NaN;
  return Number(trimmed);
}
export function parseMatrix(text) {
  const cleaned = text.trim().replace(/[\[\]()]/g, "");
  // Semicolons/newlines separate rows. Decimal commas are allowed with these
  // separators when columns are separated by whitespace.
  const rows = cleaned.split(/;|\r?\n/).filter((s) => s.trim());
  if (rows.length === 3) {
    const matrix = rows.map((row) => {
      const spaces = row.trim().split(/\s+/);
      return (spaces.length === 3 ? spaces : row.trim().split(/,\s*/)).map(
        parseNumber,
      );
    });
    if (matrix.every((row) => row.length === 3 && row.every(Number.isFinite)))
      return matrix;
  }
  const items = cleaned
    .split(/[\s,;]+/)
    .filter(Boolean)
    .map(parseNumber);
  if (items.length !== 9 || items.some((x) => !Number.isFinite(x)))
    throw new Error(
      "Introdu 9 numere, pe 3 rânduri. Separă coloanele prin spații; pentru zecimale poți folosi punct sau virgulă.",
    );
  return [items.slice(0, 3), items.slice(3, 6), items.slice(6, 9)];
}
