# AXIS — Atelier de rotații

Website scris în JavaScript, HTML și CSS, cu Vite și KaTeX. Toate calculele rulează local în browser; nu necesită backend, cont sau chei API.

## Pornire

Necesită Node.js 22.12 sau mai nou.

```sh
npm install
npm run dev
```

Deschide adresa afișată în terminal. Pentru versiunea de producție:

```sh
npm test
npm run build
npm run preview
```

## Funcționalități

- Toate cele 12 secvențe Euler / Tait–Bryan: XYX, XYZ, XZX, XZY, YXY, YXZ, YZX, YZY, ZXY, ZXZ, ZYX, ZYZ.
- Matrice elementare, produs intermediar și matrice completă, generate simbolic prin înmulțire.
- Pentru fiecare produs: dezvoltarea tuturor celor 9 elemente prin regula rând × coloană, inclusiv termenii nuli, apoi forma simplificată.
- Termeni sin(α), cos(β), sin(γ) scriși integral, fără prescurtări trigonometrice.
- Introducerea unei matrici numerice, inclusiv prin lipire, validare de ortogonalitate și determinant +1.
- Două ramuri de soluții în cazul general, cu formule, înlocuiri numerice și verificare prin recompunere.
- Cazuri singulare tratate separat, fără împărțire la zero.
- Generator de exemple din unghiuri, copiere LaTeX și export prin dialogul de imprimare PDF.
- Interfață în română, adaptată pentru mobil și navigare de la tastatură.

## Convenții matematice

Rotații intrinseci, vectori coloană, regula mâinii drepte. Pentru secvența ABC:

```text
R = R_A(α) · R_B(β) · R_C(γ)
```

Coloanele lui R sunt axele proprii exprimate în sistemul fix. Convenția din îndrumar este `atan2(x; y)`, cu argumentul de cosinus înaintea celui de sinus. Funcția `atan2Document(x, y)` adaptează această convenție la `Math.atan2(y, x)`. Factorul comun sin(β) sau cos(β) este eliminat înainte de evaluarea unghiului, păstrând semnele pentru fiecare ramură.

Formulele inverse sunt derivate automat din structura matricii simbolice. În apropierea singularității, β este evaluat prin atan2 cu elementele complementare pentru a evita pierderea preciziei din arccos/arcsin. La singularitate se alege α = 0 și se determină γ din matricea redusă; este afișat un reprezentant al familiei infinite, nu o soluție unică.

Matricele numerice sunt acceptate cu toleranța 5×10⁻⁵ pentru determinant și ortogonalitate, astfel încât valorile rotunjite la 6 zecimale să poată fi folosite. Matricea originală nu este proiectată sau modificată automat. Abaterea de reconstrucție este afișată pentru fiecare soluție.

Pentru YZY, termenul r₁₃ este calculat complet: `cos(α)cos(β)sin(γ) + sin(α)cos(γ)`.

## Publicare pe Vercel

1. Încarcă proiectul într-un repository GitHub (fără `node_modules`, `dist` sau `tmp`). Include `package-lock.json`.
2. În Vercel, alege **Add New → Project** și importă repository-ul.
3. Framework preset: **Vite**; Build command: **npm run build**; Output directory: **dist**; Node.js: **22.x** sau mai nou.
4. Apasă **Deploy**. Nu sunt necesare variabile de mediu.

Fișierul `vercel.json` conține deja configurația. Documentație oficială: https://vercel.com/docs/frameworks/frontend/vite

## Structură

- `src/math.js` — algebră simbolică și calcul numeric, independent de interfață.
- `src/main.js` — interfață și afișarea pașilor prin KaTeX.
- `src/style.css` — stiluri responsive și imprimare.
- `tests/math.test.js` — verificări pentru toate secvențele, inclusiv referință independentă prin cuaternioni, singularități și intrări invalide.

Fonturile interfeței sunt încărcate de pe Google Fonts, cu fonturi de rezervă locale. KaTeX și fonturile matematice sunt incluse în build. Calculele nu folosesc servicii externe.
