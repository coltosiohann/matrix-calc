import {
  atan2Document,
  matrixLatex,
  normalize,
  numericElementary,
  numericMultiply,
  rad,
} from "./math.js";

const number = (value) =>
  Number(value.toPrecision(10))
    .toString()
    .replace(/e([+-]?\d+)/, "\\times 10^{$1}");
const degrees = (value) => `${number(value)}^\\circ`;
const entry = (p) => `r_{${p.i + 1}${p.j + 1}}`;
const group = (title, description, lines, math) =>
  `<section class="numeric-step"><h4>${title}</h4><p>${description}</p>${lines.map((line) => `<div class="math-scroll">${math(line)}</div>`).join("")}</section>`;

// The trace uses one signed common divisor, matching the handout's factoring.
// The returned intermediate values also allow the UI to explain the quadrant.
export function angleTrace(pair, factor, beta, matrix) {
  const denominator = pair.cos.sign * Math[factor](rad(beta));
  const numeratorX = matrix[pair.cos.i][pair.cos.j];
  const numeratorY = matrix[pair.sin.i][pair.sin.j];
  const x = numeratorX / denominator;
  const y = numeratorY / denominator;
  const atan = atan2Document(x, y);
  const outerSign = pair.cos.sign === pair.sin.sign ? 1 : -1;
  return {
    denominator,
    numeratorX,
    numeratorY,
    x,
    y,
    atan,
    outerSign,
    raw: outerSign * atan,
    angle: normalize(outerSign * atan),
  };
}

function betaSteps(recipe, solution, index, matrix, firstSolution, math) {
  const beta = solution.angles[1];
  const raw = recipe.beta.sign * matrix[recipe.beta.i][recipe.beta.j];
  const clamped = Math.min(1, Math.max(-1, raw));
  const sign = recipe.beta.sign < 0 ? "-" : "";
  const name = entry(recipe.beta);
  const lines = [`${name}=${number(matrix[recipe.beta.i][recipe.beta.j])}`];
  if (index === 0) {
    const inverse = recipe.proper ? "arccos" : "arcsin";
    if (raw !== clamped)
      lines.push(`\\min(1,\\max(-1,${number(raw)}))=${number(clamped)}`);
    const inverseValue =
      ((recipe.proper ? Math.acos(clamped) : Math.asin(clamped)) * 180) /
      Math.PI;
    lines.push(
      `\\beta_1=\\${inverse}(${sign}${name})=\\${inverse}(${number(clamped)})\\approx ${degrees(inverseValue)}`,
    );
    // Explain the actual stable evaluation used by the solver, including near
    // singularities where inverse sine/cosine alone loses precision.
    const pair = recipe.alpha;
    const a = matrix[pair.cos.i][pair.cos.j];
    const b = matrix[pair.sin.i][pair.sin.j];
    const complementary = Math.hypot(a, b);
    lines.push(
      `\\sqrt{${entry(pair.cos)}^2+${entry(pair.sin)}^2}=\\sqrt{(${number(a)})^2+(${number(b)})^2}\\approx ${number(complementary)}`,
    );
    lines.push(
      `\\beta_1=\\operatorname{atan2}\\left(${number(recipe.proper ? clamped : complementary)};\\,${number(recipe.proper ? complementary : clamped)}\\right)\\approx ${degrees(beta)}`,
    );
  } else if (recipe.proper) {
    lines.push(
      `\\beta_2=-\\beta_1=-(${degrees(firstSolution.angles[1])})=${degrees(beta)}`,
    );
  } else {
    const beforeNormalization = 180 - firstSolution.angles[1];
    lines.push(
      `\\beta_2=180^\\circ-\\beta_1=180^\\circ-(${degrees(firstSolution.angles[1])})=${degrees(beforeNormalization)}`,
    );
    if (Math.abs(beforeNormalization - beta) > 1e-7)
      lines.push(`\\beta_2\\equiv ${degrees(beta)}\\pmod{360^\\circ}`);
  }
  return group(
    `1. Calculăm β${index + 1}`,
    index === 0
      ? "Înlocuim elementul matricii. Evaluarea atan2 echivalentă păstrează precizia și lângă singularitate; primul argument este componenta de cosinus."
      : "Pornim de la prima ramură și calculăm explicit a doua valoare a unghiului β.",
    lines,
    math,
  );
}

function angleSteps(
  pair,
  factor,
  beta,
  matrix,
  label,
  angle,
  index,
  step,
  math,
) {
  const trace = angleTrace(pair, factor, beta, matrix);
  const outer = trace.outerSign < 0 ? "-" : "";
  const factorSign = pair.cos.sign < 0 ? "-" : "";
  const denominator = `${factorSign}\\${factor}(\\beta_{${index + 1}})`;
  const angleLabel = `${label}_{${index + 1}}`;
  const lines = [
    `${denominator}=${factorSign}\\${factor}(${degrees(beta)})\\approx ${number(trace.denominator)}`,
    `${angleLabel}=${outer}\\operatorname{atan2}\\left(\\frac{${entry(pair.cos)}}{${denominator}};\\,\\frac{${entry(pair.sin)}}{${denominator}}\\right)`,
    `${angleLabel}\\approx ${outer}\\operatorname{atan2}\\left(\\frac{${number(trace.numeratorX)}}{${number(trace.denominator)}};\\,\\frac{${number(trace.numeratorY)}}{${number(trace.denominator)}}\\right)`,
    `\\frac{${number(trace.numeratorX)}}{${number(trace.denominator)}}\\approx ${number(trace.x)},\\qquad \\frac{${number(trace.numeratorY)}}{${number(trace.denominator)}}\\approx ${number(trace.y)}`,
    `\\operatorname{atan2}(${number(trace.x)};\\,${number(trace.y)})\\approx ${degrees(trace.atan)}`,
    `${angleLabel}\\approx ${trace.outerSign < 0 ? `-(${degrees(trace.atan)})` : degrees(trace.atan)}=${degrees(trace.raw)}`,
  ];
  if (Math.abs(trace.raw - angle) > 1e-7)
    lines.push(`${angleLabel}\\equiv ${degrees(angle)}\\pmod{360^\\circ}`);
  lines.push(`\\boxed{${angleLabel}\\approx ${degrees(angle)}}`);
  return group(
    `${step}. Calculăm ${label === "\\alpha" ? "α" : "γ"}${index + 1}`,
    "Calculăm factorul comun cu semnul său, efectuăm ambele împărțiri, apoi evaluăm atan2(x; y) în cadranul corect. Aplicăm și semnul din fața funcției.",
    lines,
    math,
  );
}

function singularSteps(sequence, solution, matrix, math) {
  const beta = solution.angles[1];
  const elementary = numericElementary(sequence[1], -beta);
  const reduced = numericMultiply(elementary, matrix);
  const axis = sequence[2];
  const cosPosition = axis === "X" ? [1, 1] : [0, 0];
  const sinPosition = axis === "X" ? [2, 1] : axis === "Y" ? [0, 2] : [1, 0];
  const x = reduced[cosPosition[0]][cosPosition[1]];
  const y = reduced[sinPosition[0]][sinPosition[1]];
  return group(
    "2. Alegem α = 0° și aflăm γ",
    "La singularitate, α și γ nu sunt determinate individual. Fixăm α = 0° și eliminăm rotația β prin înmulțire la stânga; nu împărțim la un factor nul.",
    [
      "\\alpha=0^\\circ",
      `R_{${axis.toLowerCase()}}(\\gamma)=R_{${sequence[1].toLowerCase()}}(-\\beta)R`,
      `R_{${axis.toLowerCase()}}(\\gamma)\\approx ${matrixLatex(elementary, number)}\\cdot ${matrixLatex(matrix, number)}`,
      `R_{${axis.toLowerCase()}}(\\gamma)\\approx ${matrixLatex(reduced, number)}`,
      `\\cos(\\gamma)\\approx ${number(x)},\\qquad \\sin(\\gamma)\\approx ${number(y)}`,
      `\\gamma=\\operatorname{atan2}(${number(x)};\\,${number(y)})\\approx ${degrees(atan2Document(x, y))}`,
      `\\boxed{\\gamma\\equiv ${degrees(solution.angles[2])}\\pmod{360^\\circ}}`,
    ],
    math,
  );
}

export function renderNumericalSteps(sequence, matrix, result, index, math) {
  const { recipe, solutions, singular } = result;
  const solution = solutions[index];
  const [alpha, beta, gamma] = solution.angles;
  const betaHtml = betaSteps(
    recipe,
    solution,
    index,
    matrix,
    solutions[0],
    math,
  );
  const remaining = singular
    ? singularSteps(sequence, solution, matrix, math)
    : angleSteps(
        recipe.alpha,
        recipe.factor,
        beta,
        matrix,
        "\\alpha",
        alpha,
        index,
        2,
        math,
      ) +
      angleSteps(
        recipe.gamma,
        recipe.factor,
        beta,
        matrix,
        "\\gamma",
        gamma,
        index,
        3,
        math,
      );
  return `<div class="numerical-steps"><h3>Calcul numeric complet · ${singular ? "reprezentant ales" : `soluția ${index + 1}`}</h3>${betaHtml}${remaining}<div class="numerical-conclusion"><span>TRIPLETUL OBȚINUT</span><div class="math-scroll">${math(`\\boxed{(\\alpha,\\beta,\\gamma)\\approx(${degrees(alpha)},\\,${degrees(beta)},\\,${degrees(gamma)})}`)}</div></div><p class="rounding-note">Pașii afișează valori rotunjite. Calculele și verificarea folosesc precizia completă.</p></div>`;
}
