import katex from "katex";
import "katex/dist/katex.min.css";
import "./style.css";
import { renderNumericalSteps } from "./inverse-explanation.js";
import {
  ANGLES,
  SEQUENCES,
  symbolicSequence,
  polynomialLatex,
  matrixLatex,
  rawCellLatex,
  numericSequence,
  solveInverse,
  formatNumber,
  parseNumber,
  parseMatrix,
} from "./math.js";

const $ = (selector) => document.querySelector(selector);
let sequence = "YZY";
let activeStage = 1;
let currentSymbolic;
const icon = (name, size = 20) => {
  const paths = {
    arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4H4v12h4"/>',
    download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    chevron: '<path d="m9 5 7 7-7 7"/>',
    rotate: '<path d="M20 7v5h-5M20 12a8 8 0 1 0-2 5"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>',
    sun: '<path d="M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4"/><circle cx="12" cy="12" r="4"/>',
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.arrow}</svg>`;
};
const math = (latex, display = true) =>
  katex.renderToString(latex, {
    displayMode: display,
    throwOnError: false,
    output: "htmlAndMathml",
  });
const matrixName = (axis, i) => `R_${axis.toLowerCase()}(${ANGLES[i]})`;
const rName = (p) => `r_{${p.i + 1}${p.j + 1}}`;
const signedR = (p) => `${p.sign < 0 ? "-" : ""}${rName(p)}`;
// Factor out the SAME signed factor from both entries, as in the handout.
// For YZY this gives alpha = -atan2(r12/-sin(beta); r32/-sin(beta)).
const angleFormula = (pair, factor, beta = "\\beta") => {
  const denominator = `${pair.cos.sign < 0 ? "-" : ""}\\${factor}(${beta})`;
  const sign = pair.cos.sign === pair.sin.sign ? "" : "-";
  return `${sign}\\operatorname{atan2}\\left(\\frac{${rName(pair.cos)}}{${denominator}};\\,\\frac{${rName(pair.sin)}}{${denominator}}\\right)`;
};

$("#app").innerHTML = `
  <aside class="sidebar">
    <a class="brand" href="#" aria-label="AXIS — început"><img src="/favicon.svg" alt=""/><span>axis<span class="brand-dot">.</span></span></a>
    <div class="side-label">ATELIER DE ROTAȚII</div>
    <nav aria-label="Navigare principală">
      <a class="nav-link active" href="#calculator"><span class="nav-icon">▦</span> Calculator <span class="nav-dot"></span></a>
      <a class="nav-link" href="#inverse"><span class="nav-icon">↗</span> Unghiuri din matrice</a>
      <a class="nav-link" href="#conventions"><span class="nav-icon">◎</span> Convenții & metodă</a>
    </nav>
    <div class="side-note"><span class="tiny-axis">x <span>y</span> <b>z</b></span><p>De la rotație<br>la înțelegere.</p><span>Un calcul. Toți pașii.</span></div>
    <div class="side-bottom"><span class="status-dot"></span> Calcul local, în browser <span class="version">v1.0</span></div>
  </aside>
  <div class="workspace">
    <header class="topbar"><span>MATEMATICĂ APLICATĂ <span class="breadcrumb-slash">/</span> <b>Orientare în spațiu</b></span><button class="quiet-button print-button" id="print">${icon("download", 16)} Salvează PDF</button></header>
    <main id="calculator">
      <section class="intro"><div><div class="eyebrow"><span></span> LABORATOR INTERACTIV</div><h1>Rotații în spațiu.<br><em>Explicate, pas cu pas.</em></h1><p>Scrie secvența. Urmărește calculul simbolic.<br>Descoperă unghiurile din matricea ta.</p></div>
      <div class="intro-drawing" aria-hidden="true"><svg viewBox="0 0 300 210"><defs><pattern id="dots" width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".8" fill="#d1dadd"/></pattern><marker id="head" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0 6 3 0 6" fill="none" stroke="#718286"/></marker></defs><rect width="300" height="210" fill="url(#dots)"/><path d="M150 165 240 117 151 69 64 117Z" fill="#e9eef0" stroke="#d5dfe1"/><path d="M150 165V58m0 107 95-51m-95 51-91-50" stroke="#718286" fill="none" marker-end="url(#head)"/><path d="M151 151 208 121 208 62 151 92 94 62 94 121Z M151 151V92 M94 62 151 32 208 62" stroke="#1e5961" stroke-width="1.5" fill="#c2d6d53b"/><path d="M114 164Q164 192 200 153" fill="none" stroke="#c38553" stroke-width="1.7" stroke-dasharray="4 3"/><text x="249" y="117">y</text><text x="47" y="115">x</text><text x="146" y="24">z</text><text x="207" y="171" fill="#b27543">α</text></svg><span>SO(3) <i>·</i> rotații intrinseci</span></div></section>

      <section class="config-card" aria-labelledby="config-title"><div class="config-top"><div><span class="section-kicker">01 / CONFIGURARE</span><h2 id="config-title">Cu ce secvență lucrăm?</h2></div><span class="tag">12 secvențe disponibile</span></div><div class="config-body"><div class="sequence-field"><label for="sequence">Secvența de rotație</label><div class="sequence-select"><input id="sequence" type="text" value="YZY" placeholder="ex. YZY" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-describedby="sequence-type sequence-error" /><span class="sequence-key" aria-hidden="true">↵</span></div><span id="sequence-type" class="field-hint"></span><span id="sequence-error" class="sequence-error" role="alert"></span></div><div class="rotation-flow" id="rotation-flow"></div><button class="primary-button" id="calculate">Desfășoară calculul ${icon("arrow", 18)}</button></div><div class="convention-strip">${icon("info", 15)} <span>Rotim în jurul <strong>axelor proprii</strong>, în ordinea scrisă. Unghiurile: α, β, γ.</span><a href="#conventions">Vezi convențiile ↗</a></div></section>

      <section class="symbolic-section" id="symbolic"><div class="section-heading"><div><span class="section-kicker">02 / CALCUL SIMBOLIC</span><h2>Fiecare înmulțire, la vedere.</h2></div><button class="quiet-button" id="copy-latex">${icon("copy", 16)} Copiază LaTeX</button></div><div class="step-tabs" role="tablist" aria-label="Pașii calculului"><button class="step-tab" data-stage="1" role="tab" id="tab-1" aria-controls="stage-content"><span>1</span> Matricele elementare</button><button class="step-tab" data-stage="2" role="tab" id="tab-2" aria-controls="stage-content"><span>2</span> Primele două rotații</button><button class="step-tab" data-stage="3" role="tab" id="tab-3" aria-controls="stage-content"><span>3</span> Matricea completă</button></div><div class="stage-panel" id="stage-content" role="tabpanel" tabindex="0"></div></section>

      <section id="inverse" class="inverse-section"><div class="section-heading"><div><span class="section-kicker">03 / PROBLEMA INVERSĂ</span><h2>Ai matricea. Află unghiurile.</h2><p>Introdu valorile numerice pentru secvența <strong id="inverse-sequence">YZY</strong>.</p></div><span class="tag green-tag">Convenția atan2(x; y)</span></div><div class="inverse-layout"><div class="numeric-card"><div class="card-label">MATRICEA TA <span>R ∈ ℝ³ˣ³</span></div><div class="matrix-entry"><span class="matrix-prefix">R =</span><div class="input-matrix">${Array.from({ length: 9 }, (_, i) => `<div><label for="r-${i}">r<sub>${Math.floor(i / 3) + 1}${(i % 3) + 1}</sub></label><input id="r-${i}" aria-label="r${Math.floor(i / 3) + 1}${(i % 3) + 1}" inputmode="decimal" autocomplete="off" placeholder="${i % 4 === 0 ? "1" : "0"}" /></div>`).join("")}</div></div><details class="paste-details"><summary>Lipește o matrice întreagă</summary><label for="paste-matrix">Trei rânduri; coloane separate prin spații.</label><textarea id="paste-matrix" rows="3" placeholder="1 0 0&#10;0 1 0&#10;0 0 1"></textarea><button class="quiet-button" id="apply-paste">Aplică valorile ${icon("arrow", 14)}</button></details><div class="numeric-actions"><button class="primary-button" id="solve">Calculează unghiurile ${icon("arrow", 18)}</button><button class="icon-button" id="identity" aria-label="Completează matricea identitate" title="Matricea identitate">${icon("rotate", 18)}</button></div><p class="field-hint">Acceptă punct sau virgulă zecimală. Recomandat: minimum 6 zecimale.</p><div id="input-error" role="alert"></div></div><div class="example-card"><span class="section-kicker">ÎNCEARCĂ ÎNTÂI UN EXEMPLU</span><h3>De la unghiuri<br>la matrice și înapoi.</h3><p>Generează o matrice cunoscută, apoi verifică unghiurile recuperate.</p><div class="angle-inputs">${["α", "β", "γ"].map((a, i) => `<label>${a}<div><input type="number" id="angle-${i}" value="${[30, 45, 60][i]}" step="any" aria-label="Unghiul ${["alfa", "beta", "gama"][i]} în grade"/><span>°</span></div></label>`).join("")}</div><button class="outline-button" id="generate">Generează matricea ${icon("arrow", 16)}</button><span class="example-caption">Toate unghiurile se introduc în grade.</span></div></div><div id="inverse-results" aria-live="polite"></div></section>

      <section class="conventions" id="conventions"><div><span class="section-kicker">REPERE DE CALCUL</span><h2>Convențiile contează.</h2><p>Aceeași notație, de la primul produs până la ultima soluție.</p></div><div class="convention-items"><article><span>01</span><div><h3>atan2(x; y), ca în îndrumar</h3><p>Primul argument reprezintă componenta de cosinus (x), al doilea componenta de sinus (y). Semnele stabilesc cadranul corect.</p><div>${math("\\operatorname{atan2}(\\cos\\theta;\\sin\\theta)=\\theta", false)}</div></div></article><article><span>02</span><div><h3>Rotații intrinseci · vectori coloană</h3><p>Axele se rotesc odată cu obiectul. Coloanele lui R sunt versorii axelor proprii exprimați în reperul fix. Ordinea produsului urmează secvența aleasă.</p></div></article><article><span>03</span><div><h3>Două ramuri, aceeași orientare</h3><p>În cazul general, sunt afișate două triplete echivalente, modulo 360°. La singularitate, afișăm un reprezentant valid și explicăm nedeterminarea.</p></div></article><article><span>04</span><div><h3>Formule dezvoltate prin înmulțire</h3><p>Termenii sin(α), cos(β), sin(γ) rămân scriși integral. Formulele sunt calculate simbolic, inclusiv termenul complet r₁₃ pentru YZY, omis în îndrumar.</p></div></article></div></section>
      <footer><span class="footer-brand">axis.</span><span>Matematică vizibilă. Calcule verificabile.</span><a href="#calculator">Înapoi sus ↑</a></footer>
    </main>
  </div><div id="toast" role="status"></div>`;

function setSequence(showValidation = true) {
  const field = $("#sequence");
  const candidate = field.value.toUpperCase().replace(/\s/g, "");
  field.value = candidate;
  if (!SEQUENCES.includes(candidate)) {
    field.setAttribute("aria-invalid", "true");
    $("#sequence-type").textContent = "Scrie 3 axe: X, Y sau Z. Exemplu: YZY.";
    $("#sequence-error").textContent = showValidation
      ? /^[XYZ]{3}$/.test(candidate)
        ? "Două rotații consecutive nu pot folosi aceeași axă."
        : "Scrie exact 3 litere X, Y sau Z, de exemplu YZY."
      : "";
    return false;
  }
  field.removeAttribute("aria-invalid");
  $("#sequence-error").textContent = "";
  sequence = candidate;
  currentSymbolic = symbolicSequence(sequence);
  $("#sequence-type").textContent =
    sequence[0] === sequence[2]
      ? "Unghiuri Euler proprii"
      : "Unghiuri Tait–Bryan";
  $("#rotation-flow").innerHTML = [...sequence]
    .map(
      (axis, i) =>
        `${i ? '<span class="flow-arrow">→</span>' : ""}<div class="rotation-item"><span class="axis-pill axis-${axis.toLowerCase()}">${axis}<sub>${i ? i : ""}</sub></span><div><b>${["α", "β", "γ"][i]}</b><span>rotația ${i + 1}</span></div></div>`,
    )
    .join("");
  $("#inverse-sequence").textContent = sequence;
  $("#inverse-results").innerHTML = "";
  $("#input-error").innerHTML = "";
  renderStage(activeStage);
  return true;
}
function cellSteps(a, b, result) {
  return `<details class="cell-details"><summary><span>Dezvoltarea celor 9 elemente</span><span class="details-hint">rând × coloană <span class="plus">+</span></span></summary><div class="cell-list">${result.flatMap((row, i) => row.map((cell, j) => `<article><span class="cell-index">r<sub>${i + 1}${j + 1}</sub></span><div class="math-scroll cell-math">${math(`r_{${i + 1}${j + 1}}=${rawCellLatex(a, b, i, j)}`)}${math(`=${polynomialLatex(cell)}`)}</div></article>`)).join("")}</div></details>`;
}
function renderStage(stage) {
  activeStage = stage;
  document.querySelectorAll(".step-tab").forEach((tab) => {
    const active = Number(tab.dataset.stage) === stage;
    tab.classList.toggle("selected", active);
    tab.setAttribute("aria-selected", active);
    tab.tabIndex = active ? 0 : -1;
  });
  const { elementary, intermediate, final } = currentSymbolic;
  const names = [...sequence].map(matrixName);
  const headline = [
    null,
    "Cele trei rotații, una câte una.",
    "Compunem primele două rotații.",
    "Adăugăm a treia rotație.",
  ][stage];
  const description =
    stage === 1
      ? "Fiecare matrice descrie o rotație în jurul unei singure axe. Ordinea înmulțirii este esențială."
      : stage === 2
        ? "Înmulțim fiecare rând din prima matrice cu fiecare coloană din a doua."
        : "Înmulțim produsul intermediar cu a treia matrice. Rezultatul descrie orientarea finală.";
  let content;
  if (stage === 1) {
    content = `<div class="elementary-grid">${elementary.map((m, i) => `<article><div class="elementary-label"><span class="axis-dot axis-${sequence[i].toLowerCase()}"></span> ROTAȚIA ${i + 1} <span>AXA ${sequence[i]}</span></div><div class="math-scroll">${math(`${names[i]}=${matrixLatex(m)}`)}</div></article>`).join("")}</div><div class="composition-line"><span>Ordinea compunerii</span><div class="math-scroll">${math(`R=${names.join("\\,\\cdot\\,")}`)}</div><span class="mini-note">${sequence[0]} → ${sequence[1]}′ → ${sequence[2]}″</span></div>`;
  } else {
    const left = stage === 2 ? elementary[0] : intermediate;
    const right = stage === 2 ? elementary[1] : elementary[2];
    const product = stage === 2 ? intermediate : final;
    content = `<div class="product-label">${math(stage === 2 ? `R_{12}=${names[0]}\\cdot ${names[1]}` : `R=R_{12}\\cdot ${names[2]}`, false)}</div><div class="math-scroll multiplication">${math(`${matrixLatex(left)}\\;\\cdot\\;${matrixLatex(right)}`)}</div><div class="result-matrix"><div class="result-label"><span>${stage === 2 ? "PRODUSUL INTERMEDIAR" : `MATRICEA DE ROTAȚIE ${sequence}`}</span>${stage === 3 ? `<span class="result-badge">${icon("check", 13)} Formă completă</span>` : ""}</div><div class="math-scroll">${math(`${stage === 2 ? "R_{12}" : "R"}=${matrixLatex(product)}`)}</div></div>${cellSteps(left, right, product)}`;
  }
  $("#stage-content").setAttribute("aria-labelledby", `tab-${stage}`);
  $("#stage-content").innerHTML =
    `<div class="stage-heading"><div><h3>${headline}</h3><p>${description}</p></div><span class="step-count">PASUL 0${stage} <span>/ 03</span></span></div>${content}<div class="stage-footer"><span>${stage === 3 ? "Urmează: unghiurile din matricea numerică." : "Fără prescurtări. Fără pași săriți."}</span><button class="text-button" id="next-stage">${stage === 3 ? "Calculează unghiurile" : "Pasul următor"} ${icon("arrow", 16)}</button></div>`;
  $("#next-stage").onclick = () =>
    stage < 3
      ? renderStage(stage + 1)
      : $("#inverse").scrollIntoView({ behavior: "smooth" });
}
function fillMatrix(m) {
  m.flat().forEach((v, i) => {
    $(`#r-${i}`).value = formatNumber(v, 10);
  });
}
function readMatrix() {
  const values = Array.from({ length: 9 }, (_, i) =>
    parseNumber($(`#r-${i}`).value),
  );
  return [values.slice(0, 3), values.slice(3, 6), values.slice(6, 9)];
}
function showError(message) {
  $("#input-error").textContent = message;
  $("#input-error").className = "error-message";
}
function inverseFormulas(recipe) {
  const b = signedR(recipe.beta);
  const beta = recipe.proper
    ? `\\beta_1=\\arccos(${b}),\\qquad \\beta_2=-\\beta_1`
    : `\\beta_1=\\arcsin(${b}),\\qquad \\beta_2=180^\\circ-\\beta_1\\pmod{360^\\circ}`;
  const equations = (pair) =>
    [pair.cos, pair.sin]
      .map(
        (p) =>
          `${rName(p)}=${polynomialLatex(currentSymbolic.final[p.i][p.j])}`,
      )
      .join(",\\qquad ");
  return `<div class="inverse-derivation">
    <h3>Formulele pentru ${sequence}</h3>
    <p>1. Izolăm unghiul β din elementul care depinde doar de el:</p>
    <div class="math-scroll">${math(`${rName(recipe.beta)}=${recipe.beta.sign < 0 ? "-" : ""}\\${recipe.betaKind}(\\beta)`)}</div>
    <div class="math-scroll">${math(beta)}</div>
    <p>2. Alegem elementele care conțin cos(α) și sin(α):</p>
    <div class="math-scroll">${math(equations(recipe.alpha))}</div>
    <p>Pentru fiecare ramură k = 1, 2, împărțim <strong>înainte</strong> de atan2, păstrând semnul factorului comun. Aceste formule se aplică atunci când ${math(`\\${recipe.factor}(\\beta_k)\\ne 0`, false)}:</p>
    <div class="math-scroll">${math(`\\alpha_k=${angleFormula(recipe.alpha, recipe.factor, "\\beta_k")}`)}</div>
    <p>3. Procedăm la fel pentru cos(γ) și sin(γ):</p>
    <div class="math-scroll">${math(equations(recipe.gamma))}</div>
    <div class="math-scroll">${math(`\\gamma_k=${angleFormula(recipe.gamma, recipe.factor, "\\beta_k")}`)}</div>
  </div>`;
}
function solve() {
  if (!setSequence()) {
    $("#sequence").focus();
    return;
  }
  $("#input-error").textContent = "";
  $("#input-error").className = "";
  $("#inverse-results").innerHTML = "";
  try {
    const matrix = readMatrix();
    const result = solveInverse(sequence, matrix);
    const { recipe, validation, solutions, singular } = result;
    $("#inverse-results").innerHTML =
      `<div class="validation-strip">${icon("check", 18)}<strong>Matrice de rotație validă</strong><span>det(R) = ${formatNumber(validation.det, 8)}</span><span>abatere RᵀR: ${validation.orthogonality.toExponential(2)}</span></div>${inverseFormulas(recipe)}${singular ? `<div class="singular-note"><b>Caz singular — o familie infinită de soluții</b><p>${recipe.proper ? "sin(β) = 0" : "cos(β) = 0"}. Nu împărțim la zero: α și γ nu sunt determinate individual. Alegem α = 0° și calculăm γ din matricea redusă, pentru un reprezentant valid.</p><div class="math-scroll">${math(`R_{${sequence[2].toLowerCase()}}(\\gamma)=R_{${sequence[1].toLowerCase()}}(-\\beta)R`)}</div></div>` : ""}<div class="solutions">${solutions.map((solution, index) => `<article class="solution-card"><div class="solution-header"><span>${singular ? "UN REPREZENTANT VALID" : `SOLUȚIA 0${index + 1}`}</span><span>${singular ? "α ales convențional" : index === 0 ? "Ramura principală" : "Ramura echivalentă"}</span></div><div class="angle-results">${solution.angles.map((angle, i) => `<div><span>${["α", "β", "γ"][i]}</span><strong>${formatNumber(angle, 6)}<small>°</small></strong></div>`).join("")}</div>${renderNumericalSteps(sequence, matrix, result, index, math)}<details class="substitution"><summary>Verifică prin reconstruirea matricii</summary><div class="math-scroll">${math(`R_{\\mathrm{recalculat}}=${matrixLatex(solution.reconstructed, (x) => formatNumber(x))}`)}</div><p>Abaterea maximă față de matricea introdusă: <b>${solution.error.toExponential(3)}</b></p></details><div class="solution-check">${icon("check", 14)} ${solution.error < 1e-7 ? "Verificată prin recompunere" : "Recompusă cu abaterea afișată"}<span>ε = ${solution.error.toExponential(2)}</span></div></article>`).join("")}</div><p class="results-note">Unghiuri în grade, normalizate în intervalul [−180°, 180°] (capetele sunt echivalente). În vecinătatea singularităților, β este evaluat cu atan2 și elementele complementare pentru precizie numerică.</p>`;
  } catch (error) {
    showError(error.message);
  }
}
function toast(text) {
  $("#toast").textContent = text;
  $("#toast").classList.add("visible");
  setTimeout(() => $("#toast").classList.remove("visible"), 2600);
}

$("#sequence").addEventListener("input", () => setSequence(false));
$("#sequence").addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    $("#calculate").click();
  }
});
$("#calculate").onclick = () => {
  if (!setSequence()) {
    $("#sequence").focus();
    return;
  }
  renderStage(1);
  $("#symbolic").scrollIntoView({ behavior: "smooth", block: "start" });
};
document.querySelectorAll(".step-tab").forEach((tab) => {
  tab.onclick = () => renderStage(Number(tab.dataset.stage));
  tab.onkeydown = (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const next =
      event.key === "Home"
        ? 1
        : event.key === "End"
          ? 3
          : ((activeStage - 1 + (event.key === "ArrowRight" ? 1 : 2)) % 3) + 1;
    renderStage(next);
    $(`#tab-${next}`).focus();
  };
});
$("#generate").onclick = () => {
  if (!setSequence()) {
    $("#sequence").focus();
    return;
  }
  const angles = [0, 1, 2].map((i) => parseNumber($(`#angle-${i}`).value));
  if (angles.some((x) => !Number.isFinite(x))) {
    showError("Completează cele trei unghiuri cu numere finite.");
    return;
  }
  fillMatrix(numericSequence(sequence, angles));
  solve();
  toast("Matrice generată și unghiuri verificate.");
};
$("#solve").onclick = solve;
$("#identity").onclick = () => {
  fillMatrix([
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ]);
  solve();
};
$("#apply-paste").onclick = () => {
  try {
    fillMatrix(parseMatrix($("#paste-matrix").value));
    $("#input-error").textContent = "";
    solve();
  } catch (error) {
    showError(error.message);
  }
};
document.querySelectorAll(".input-matrix input").forEach((input) =>
  input.addEventListener("input", () => {
    $("#inverse-results").innerHTML = "";
    $("#input-error").textContent = "";
  }),
);
$("#copy-latex").onclick = async () => {
  try {
    await navigator.clipboard.writeText(
      `R=${matrixLatex(currentSymbolic.final)}`,
    );
    toast("Matricea completă a fost copiată în LaTeX.");
  } catch {
    toast("Clipboard indisponibil. Folosește exportul PDF.");
  }
};
$("#print").onclick = () => {
  const oldStage = activeStage;
  const contents = [1, 2, 3]
    .map((stage) => {
      renderStage(stage);
      return `<section class="print-stage">${$("#stage-content").innerHTML}</section>`;
    })
    .join("");
  renderStage(oldStage);
  const print = document.createElement("div");
  print.id = "print-symbolic";
  print.innerHTML = contents;
  $("#symbolic").append(print);
  print.querySelectorAll("details").forEach((d) => {
    d.open = true;
  });
  window.print();
  print.remove();
};
// Highlight navigation according to the section currently in view.
function updateNavigation() {
  let current = "calculator";
  for (const id of ["inverse", "conventions"]) {
    if ($(`#${id}`).getBoundingClientRect().top <= window.innerHeight * 0.3)
      current = id;
  }
  document.querySelectorAll(".nav-link").forEach((link) => {
    const active = link.hash === `#${current}`;
    link.classList.toggle("active", active);
    if (active) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  });
}
window.addEventListener("scroll", updateNavigation, { passive: true });
updateNavigation();
setSequence();
fillMatrix(numericSequence(sequence, [30, 45, 60]));
