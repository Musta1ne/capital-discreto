import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

// Presentation-only dependencies stay outside the application dependency tree.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const build = path.join(root, 'tmp/presentation-build');
const require = createRequire(path.join(build, 'package.json'));
const PptxGenJS = require('pptxgenjs');
const sharp = require('sharp');
const JSZip = require('jszip');
const { mathjax } = require('mathjax-full/js/mathjax.js');
const { TeX } = require('mathjax-full/js/input/tex.js');
const { SVG } = require('mathjax-full/js/output/svg.js');
const { liteAdaptor } = require('mathjax-full/js/adaptors/liteAdaptor.js');
const { RegisterHTMLHandler } = require('mathjax-full/js/handlers/html.js');
const { AllPackages } = require('mathjax-full/js/input/tex/AllPackages.js');
const data = JSON.parse(await fs.readFile(path.join(root, 'docs/presentation-data.json'), 'utf8'));
const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);
const mathDocument = mathjax.document('', {
  InputJax: new TeX({ packages: AllPackages }),
  OutputJax: new SVG({ fontCache: 'none' }),
});
await fs.mkdir(path.join(build, 'equations'), { recursive: true });

const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE';
pptx.author = 'Agustin Macello y Francisco Monzoni';
pptx.subject = 'Coloquio final de Análisis Numérico. UTN Facultad Regional San Francisco.';
pptx.title = 'Capital Discreto. Modelado del ahorro con Transformada Z';
pptx.company = 'UTN Facultad Regional San Francisco';
pptx.lang = 'es-AR';
pptx.theme = { headFontFace: 'Segoe UI', bodyFontFace: 'Segoe UI', lang: 'es-AR' };

const C = { bg: '101813', text: 'F1F5ED', muted: 'B2C3A8', accent: 'B6ED80', cyan: '91D5E4', orange: 'F2BD92', grid: '40523A' };
const FONT = 'Segoe UI';
const W = 13.333333, H = 7.5;
const deck = [];
const timings = [35, 75, 60, 75, 65, 55, 60, 40, 45, 55, 25, 10];
const money = v => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 2 }).format(Number(v));
const num = (v, digits = 2) => new Intl.NumberFormat('es-AR', { maximumFractionDigits: digits }).format(Number(v));
const sci = v => {
  if (Number(v) === 0) return '0';
  const [mantissa, exponent] = Number(v).toExponential(2).split('e');
  const superscripts = { '-': '⁻', '+': '', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
  return `${mantissa.replace('.', ',')} × 10${[...exponent].map(c => superscripts[c]).join('')}`;
};

function text(slide, value, x, y, w, h, options = {}) {
  slide.addText(value, { x, y, w, h, fontFace: FONT, fontSize: 21, color: C.text,
    margin: 0, breakLine: false, valign: 'mid', paraSpaceAfterPt: 0,
    ...options });
}
function newSlide(title) {
  const slide = pptx.addSlide();
  slide.background = { color: C.bg };
  if (title) text(slide, title, .6, .45, 12.1, .72, { fontSize: 32, bold: true });
  text(slide, `${pptx._slides.length} / 12`, 12.03, 7.02, .65, .22, { fontSize: 11, color: C.muted, align: 'right' });
  deck.push({ title, equations: [] });
  return slide;
}
function notes(slide, body, sources, questions = '') {
  const index = pptx._slides.indexOf(slide);
  const speaker = index < 5 ? 'Agustin Macello' : 'Francisco Monzoni';
  const value = `Tiempo orientativo: ${timings[index]} segundos. Expositor sugerido: ${speaker}.\n\nGUION\n${body}\n\n${questions ? `PARA LAS PREGUNTAS\n${questions}\n\n` : ''}FUENTES\n${sources}\n\nECUACIONES EDITABLES COMO FUENTE LATEX\n${deck[index].equations.join('\n')}`;
  slide.addNotes(value);
  deck[index].notes = value;
  deck[index].seconds = timings[index];
}
async function equation(slide, latex, x, y, maxW, fontPt = 27, color = C.text) {
  let svg = adaptor.outerHTML(mathDocument.convert(latex, { display: true }));
  svg = svg.slice(svg.indexOf('<svg'), svg.lastIndexOf('</svg>') + 6);
  const vb = svg.match(/viewBox="([^"]+)"/)[1].split(/\s+/).map(Number);
  let w = (vb[2] / 1000) * fontPt / 72;
  let h = (vb[3] / 1000) * fontPt / 72;
  if (w > maxW) { h *= maxW / w; w = maxW; }
  svg = svg.replace(/width="[^"]+"/, `width="${Math.ceil(w * 320)}"`).replace(/height="[^"]+"/, `height="${Math.ceil(h * 320)}"`).replace(/currentColor/g, `#${color}`);
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  const file = path.join(build, 'equations', `equation-${pptx._slides.length}-${deck.at(-1).equations.length}.png`);
  await fs.writeFile(file, png);
  slide.addImage({ path: file, x, y, w, h, altText: latex });
  deck.at(-1).equations.push(latex);
  return h;
}
function table(slide, headings, rows, x, y, widths, fontSize = 20, rowH = .67) {
  slide.addTable([
    headings.map(v => ({ text: v, options: { color: C.accent, bold: true, fontSize: 17, fill: C.bg } })),
    ...rows.map(row => row.map(v => ({ text: String(v), options: { color: C.text, fill: C.bg } }))),
  ], { x, y, w: widths.reduce((a, b) => a + b, 0), colW: widths, rowH,
    fontFace: FONT, fontSize, margin: [7, 9, 7, 9],
    border: [{ type: 'none' }, { type: 'none' }, { type: 'solid', pt: .7, color: C.grid }, { type: 'none' }],
    autoPage: false, valign: 'mid', color: C.text,
  });
}
function source(slide, value) { text(slide, value, .62, 6.87, 10.9, .3, { fontSize: 12.5, color: C.muted }); }

const course = 'Rivara, L., y Vercelli, S. (s. f.). Transformada Z. Apunte de Matemática Superior, UTN Facultad Regional San Francisco. Páginas impresas 4–6 y 8–9. Propiedades de la Transformada Z, filas 1, 2 y 5. Tabla de Algunas Transformadas Z: escalón, rampa y exponencial, sin numeración de pares. PDF proporcionados por los estudiantes.';
const repo = 'https://github.com/Musta1ne/capital-discreto';
const calc = 'Ejecución reproducible: python scripts/verify_colloquium.py. Datos: docs/presentation-data.json. Se ejecutaron Python 3.12.10 y Node.js v22.14.0, con las funciones de src/lib/savings.ts. Consulta de resultados: 16 de noviembre de 2026. Todos los valores de este ejemplo son supuestos didácticos.';

// 1. Opening and explicit professional motivation.
{
  const s = newSlide(null);
  const icon = await sharp(path.join(root, 'public/favicon.svg')).resize(192, 192).png().toBuffer();
  s.addImage({ data: `image/png;base64,${icon.toString('base64')}`, x: .65, y: .64, w: .48, h: .48, altText: 'Identidad de Capital Discreto' });
  text(s, 'Capital Discreto', 1.35, .66, 8, .42, { fontSize: 23, color: C.accent });
  text(s, 'Modelado del ahorro\ncon Transformada Z', .65, 1.65, 11.9, 1.75, { fontSize: 43, bold: true, breakLine: false });
  text(s, 'Una regla de actualización del saldo como problema de tiempo discreto', .7, 3.62, 11.7, .72, { fontSize: 23, color: C.muted });
  text(s, 'Agustin Macello\nFrancisco Monzoni', .7, 5.08, 6.6, .85, { fontSize: 22 });
  text(s, 'Análisis Numérico 2026\nIngeniería en Sistemas de Información\nUTN Facultad Regional San Francisco', 7.45, 5.08, 5.1, 1.12, { fontSize: 17, color: C.muted });
  notes(s, 'Presentamos un modelo de ahorro con aportes periódicos y reinversión. Elegimos este tema porque permite conectar una herramienta matemática vista en la materia con una aplicación verificable. Para Ingeniería en Sistemas, interesa convertir una regla de actualización en un algoritmo, identificar sus supuestos y comparar formas de calcularla. La web funciona como herramienta de exploración. La presentación se concentra en el modelo y en su resolución.', course + '\nRepositorio: ' + repo);
}
// 2. Model, timing and conversion of the illustrative rate.
{
  const s = newSlide('Modelo y aportes al cierre');
  await equation(s, String.raw`y(n)=(1+i)y(n-1)+P`, .7, 1.6, 7.2, 31, C.accent);
  await equation(s, String.raw`y(0)=0,\qquad n\geq1`, .7, 2.45, 6, 25);
  text(s, 'P: aporte fijo al cierre\ni: tasa de cada colocación de 30 días\ny(n): saldo después del aporte n', .7, 3.3, 6.5, 1.3, { fontSize: 21, breakLine: false });
  table(s, ['Período', 'Día', 'Saldo'], [['0', '0', '$0'], ['1', '30', 'P'], ['2', '60', '(1+i)P + P']], 7.7, 1.65, [1.2, 1.0, 2.75], 19, .72);
  await equation(s, String.raw`i=\frac{\mathrm{TNA}}{100}\frac{30}{365}=0{,}03`, .7, 5.28, 8.2, 27);
  text(s, 'Caso didáctico: P = $100.000 y TNA = 36,5 %', .7, 6.1, 11.9, .42, { fontSize: 21, color: C.accent });
  source(s, 'Reinversión total y tasa constante. Doce períodos son 360 días. La TNA elegida no es una cotización bancaria.');
  notes(s, 'El saldo comienza en cero. Primero se capitaliza el saldo anterior y después se incorpora el aporte. Por eso y(1) vale P: ese primer aporte todavía no ganó intereses. Cada período representa exactamente 30 días, no un mes calendario. Para facilitar las cuentas fijamos una TNA ilustrativa del 36,5 %, que produce una tasa por período del 3 %. El modelo supone aportes constantes, reinversión completa y ausencia de retiros. No incluye impuestos ni comisiones. Mantener la tasa durante todas las renovaciones es una hipótesis matemática.', course + '\nBCRA. Plazos fijos. https://www.bcra.gob.ar/plazos-fijos-tipos-plazos-y-rentabilidad/', 'Si el primer depósito se hiciera el día inicial, cambiaría la condición inicial y el resultado. No se debe aplicar esta fórmula sin revisar ese momento.');
}
// 3. The exact properties used in the course.
{
  const s = newSlide('Transformada Z del modelo');
  await equation(s, String.raw`Y(z)=Z[y(n)]=\sum_{n=0}^{\infty}y(n)z^{-n}`, .7, 1.48, 11.9, 29, C.accent);
  text(s, 'Linealidad', .7, 3.0, 2.8, .42, { fontSize: 22, bold: true });
  await equation(s, String.raw`Z[ay(n)+Pu(n)]=aY(z)+PZ[u(n)]`, 4.0, 2.96, 8.6, 25);
  text(s, 'Desplazamiento\ntemporal', .7, 4.08, 3.0, .8, { fontSize: 22, bold: true });
  await equation(s, String.raw`Z[y(n+1)]=z[Y(z)-y(0)]`, 4.0, 4.2, 8.6, 25);
  await equation(s, String.raw`y(n+1)=ay(n)+Pu(n),\quad a=1+i,\quad Z[u(n)]=\frac{z}{z-1}`, .7, 5.45, 11.8, 23);
  text(s, 'u(n) es el escalón unitario. La tabla lo escribe U[n].', .7, 6.38, 11.9, .38, { fontSize: 19, color: C.muted });
  source(s, 'Apunte, pp. 4–6. Tabla de propiedades: filas 1 y 2.');
  notes(s, 'Los saldos forman una sucesión o señal en tiempo discreto. Usamos la transformada unilateral, cuya suma comienza en n igual a cero. Reescribimos la regla como y(n+1) = a y(n) + P u(n), con a igual a uno más i. Aplicamos linealidad para transformar cada término. El desplazamiento temporal incorpora el valor inicial, y el par del escalón convierte la entrada constante en Pz/(z−1). En esta ecuación, la entrada de la transición n igual a cero se suma a y(1), sin modificar y(0).', course, 'El escalón del apunte u(n) y U[n] de la tabla representan la misma señal. La transformada existe en una región del plano z aunque la sucesión del ahorro crezca.');
}
// 4. Follow the actual partial-fraction procedure from the supplied notes.
{
  const s = newSlide('Fracciones parciales y transformada inversa');
  await equation(s, String.raw`Y(z)=\frac{Pz}{(z-a)(z-1)}`, .72, 1.42, 11.8, 29);
  await equation(s, String.raw`\frac{Y(z)}{z}=\frac{P}{(z-a)(z-1)}=\frac{A}{z-a}+\frac{B}{z-1}`, .72, 2.43, 11.8, 28);
  await equation(s, String.raw`A=\frac{P}{i},\qquad B=-\frac{P}{i}\qquad(i\neq0)`, .72, 3.5, 11.8, 25);
  await equation(s, String.raw`Y(z)=\frac{P}{i}\left(\frac{z}{z-a}-\frac{z}{z-1}\right)`, .72, 4.48, 11.8, 27);
  await equation(s, String.raw`y(n)=P\frac{(1+i)^n-1}{i}`, .72, 5.62, 8.8, 31, C.accent);
  text(s, 'Si i = 0: y(n) = Pn', 8.25, 5.85, 4.25, .45, { fontSize: 23, color: C.cyan });
  source(s, 'Antitransformada = transformada inversa. Apunte, pp. 8–9. Pares del escalón, la exponencial y la rampa.');
  notes(s, 'Con y(0) igual a cero, la ecuación transformada queda zY = aY + Pz/(z−1). Despejamos Y y seguimos el procedimiento del apunte: dividir por z antes de descomponer. Al igualar numeradores aparece P = A(z−1) + B(z−a). Con a−1 igual a i, obtenemos A = P/i y B = −P/i. Volvemos a multiplicar por z, reconocemos los pares z/(z−a) y z/(z−1), y aplicamos la transformada inversa o antitransformada. Si i vale cero, usamos el par de la rampa y obtenemos Pn.', course, 'Para P>0 e i>0, la serie transformada converge si |z|>1+i; para i=0, si |z|>1. Esto no significa que el saldo tenga un límite finito. La propiedad del valor inicial confirma lim(z→∞)Y(z)=0. Con P>0 e i≥0 no se aplica el teorema del valor final para atribuir un saldo límite finito.');
}
// 5. Native, editable table of the actual manual calculation.
{
  const s = newSlide('Resolución manual del caso');
  text(s, 'P = $100.000     i = 0,03     n = 3 períodos', .7, 1.45, 11.9, .45, { fontSize: 24, color: C.accent });
  table(s, ['n', 'Actualización del saldo', 'Saldo en ARS'], [
    ['0', 'Condición inicial', '$0'],
    ['1', '1,03 × 0 + 100.000', '$100.000'],
    ['2', '1,03 × 100.000 + 100.000', '$203.000'],
    ['3', '1,03 × 203.000 + 100.000', '$309.090'],
  ], .7, 2.3, [.7, 7.2, 4.0], 23, .72);
  text(s, 'Aportes: $300.000', .8, 6.0, 5.8, .45, { fontSize: 26 });
  text(s, 'Intereses: $9.090', 7.1, 6.0, 5.2, .45, { fontSize: 26, color: C.accent });
  source(s, 'Caso didáctico a tasa constante. El tercer aporte todavía no generó intereses.');
  notes(s, 'Aplicamos tres veces la ecuación en diferencias. En el primer cierre no hay un saldo previo que capitalizar y depositamos cien mil pesos. En el segundo, los tres mil de intereses se suman al primer saldo y al nuevo aporte. En el tercero, el saldo anterior genera seis mil noventa de intereses. El resultado final es trescientos nueve mil noventa pesos, con trescientos mil aportados. La fórmula obtenida por Z también da 100000 por (1,03 al cubo menos uno), dividido por 0,03, igual a 309090.', calc, 'Cada aporte tiene una antigüedad distinta. El primero ganó dos períodos; el segundo, uno; el tercero, ninguno. Esta interpretación permite detectar errores de indexación.');
}
// 6. Manual, AI-assisted and actually executed implementations.
{
  const s = newSlide('Comparación de las resoluciones');
  table(s, ['Enfoque', 'Saldo mostrado', 'Error absoluto en ARS'], [
    ['Desarrollo manual', money(309090), '0 (caso exacto)'],
    ['Resolución asistida por IA', money(309090), '— (verificación simbólica)'],
    ['Python: fórmula estable', money(data.caseStudy.python.methods.stable), sci(data.caseStudy.python.errorsAgainstDecimal.stable.absolute)],
    ['Web: fórmula estable', money(data.caseStudy.javascript.methods.stable), sci(data.caseStudy.javascript.errorsAgainstDecimal.stable.absolute)],
  ], .7, 1.55, [4.4, 3.25, 4.25], 20, .78);
  await equation(s, String.raw`|A-B|\leq10^{-6}+10^{-12}\max(|A|,|B|)`, .8, 5.65, 11.7, 24, C.accent);
  source(s, 'Mismos datos y mismo aporte al cierre. Python 3.12 y JavaScript ejecutados el 16/11/2026.');
  notes(s, 'La comparación conserva los mismos datos y la misma regla de aporte. La resolución asistida por IA coincide con el desarrollo algebraico, pero esa coincidencia no sustituye la comprobación. Ejecutamos Python y las funciones reales de JavaScript del proyecto. A centavos todos muestran 309090. Python, al evaluar la forma estable, devuelve 309090.00000000006, con un error de aproximadamente 5,82 por diez a la menos once pesos respecto del resultado exacto de este caso. JavaScript devuelve exactamente 309090 para esa evaluación. Las diferencias están muy por debajo de la tolerancia mostrada.', calc + '\nSíntesis de la tarea asistida de verificación, no cita literal de un prompt: ' + data.metadata.verificationInstructionSummary, 'La tolerancia entre implementaciones verifica consistencia, no fidelidad bancaria. Fragmento Python ejecutado: stable = P * (math.expm1(n * math.log1p(i)) / i), con tratamiento separado de i==0. El programa completo está en scripts/verify_colloquium.py.');
}
// 7. Personal contribution: a real, reproducible precision experiment.
{
  const s = newSlide('Aporte personal sobre precisión numérica');
  const r = data.precisionLab.rows[1];
  text(s, 'P = $100.000     n = 60     i = 10⁻¹² por período', .7, 1.43, 11.9, .5, { fontSize: 24, color: C.accent });
  table(s, ['Evaluación', 'Saldo en ARS', 'Error absoluto en ARS'], [
    ['Potencia y resta usual', num(r.javascript.methods.usual, 6), num(r.javascript.errorsAgainstDecimal.usual.absolute, 6)],
    ['expm1 y log1p', num(r.javascript.methods.stable, 6), sci(r.javascript.errorsAgainstDecimal.stable.absolute)],
    ['Referencia decimal exacta', '6.000.000,000177…', '0'],
  ], .7, 2.15, [4.35, 4.0, 3.55], 21, .68);
  await equation(s, String.raw`P\frac{\operatorname{expm1}(n\operatorname{log1p}(i))}{i}`, .8, 5.45, 6.9, 27, C.accent);
  text(s, 'La resta de números cercanos pierde cifras significativas', 7.45, 5.4, 5.0, 1.12, { fontSize: 23, color: C.muted });
  source(s, 'Referencia decimal exacta para las entradas del experimento. No es una tasa bancaria observada.');
  notes(s, 'Nuestro aporte personal estudia una limitación de la evaluación numérica. Con una tasa extremadamente pequeña, uno más i es muy cercano a uno. Elevarlo y restar uno puede perder cifras significativas. La forma usual calcula un saldo unos 533,40 pesos por encima de la referencia, aunque la capitalización verdadera es diminuta. Reescribir la expresión con log1p y expm1 reduce ese error a unos 2,82 por diez a la menos diez pesos en esta ejecución. La referencia decimal de la recurrencia es exacta para estas entradas: se usó precisión suficiente y se comprobaron las señales de redondeo.', calc + '\nEcma International. (2025). ECMAScript 2025 language specification. Math.log1p y Math.expm1. https://tc39.es/ecma262/2025/multipage/numbers-and-dates.html#sec-math.expm1\nPython Software Foundation. decimal. https://docs.python.org/3.12/library/decimal.html', 'La forma estable no convierte todos los cálculos binarios en exactos. La recurrencia también acumula redondeo. expm1(x)=exp(x)−1 y log1p(x)=ln(1+x), con evaluación adecuada cerca de cero. El problema observado corresponde a redondeo y cancelación, no a discretizar una ecuación diferencial.');
}
// 8. Editable chart gives a legible, self-contained application demonstration.
{
  const s = newSlide('Implementación y evolución del ahorro');
  const rows = data.nominalSeries.rows;
  s.addChart(pptx.ChartType.line, [
    { name: 'Saldo con intereses', labels: rows.map(r => String(r.period)), values: rows.map(r => r.balance) },
    { name: 'Aportes sin intereses', labels: rows.map(r => String(r.period)), values: rows.map(r => r.contributed) },
  ], { x: .55, y: 1.6, w: 8.5, h: 4.9, showLegend: true, legendPos: 'b', legendFontFace: FONT, legendFontSize: 17, legendColor: C.text,
    chartColors: [C.accent, '9C9BB8'], chartArea: { fill: { color: C.bg }, border: { color: C.bg, pt: 0 } }, plotArea: { fill: { color: C.bg }, border: { color: C.bg, pt: 0 } },
    catAxisLabelFontFace: FONT, catAxisLabelFontSize: 16, catAxisLabelColor: C.muted,
    valAxisLabelFontFace: FONT, valAxisLabelFontSize: 16, valAxisLabelColor: C.muted,
    catAxisTitle: 'Períodos de 30 días', showCatAxisTitle: true, catAxisTitleFontFace: FONT, catAxisTitleFontSize: 17, catAxisTitleColor: C.text,
    valAxisTitle: 'Saldo en ARS', showValAxisTitle: true, valAxisTitleFontFace: FONT, valAxisTitleFontSize: 17, valAxisTitleColor: C.text,
    valAxisLabelFormatCode: '0.0,," M"', valAxisMinVal: 0, valAxisMaxVal: 1600000, valAxisMajorUnit: 400000,
    catAxisLineColor: C.grid, valAxisLineColor: C.grid, valGridLine: { color: C.grid, size: .7 },
    showValue: false, dataLabelFontFace: FONT, lineSize: 3, lineDataSymbol: 'circle', lineDataSymbolSize: 4,
    showTitle: false, titleFontFace: FONT, showBorder: false,
  });
  text(s, 'Caso extendido\na 12 períodos', 9.45, 1.72, 3.2, .9, { fontSize: 24, color: C.muted });
  text(s, money(rows.at(-1).balance), 9.45, 3.0, 3.2, .52, { fontSize: 28, bold: true, color: C.accent });
  text(s, 'Saldo nominal', 9.45, 3.67, 3.1, .35, { fontSize: 19, color: C.muted });
  text(s, 'Capital Discreto\nSimulación y comparación\nde tasas y precisión', 9.45, 4.5, 3.1, 1.15, { fontSize: 20 });
  text(s, 'Ver código en GitHub', 9.45, 6.04, 3.1, .4, { fontSize: 18, color: C.cyan, hyperlink: { url: repo }, underline: true });
  source(s, 'P = $100.000 y TNA = 36,5 % ilustrativa. Fuente del gráfico: cálculo del modelo.');
  notes(s, 'Extendemos el mismo caso a doce períodos para ver la acumulación de intereses frente al ahorro sin intereses. Los ejes identifican períodos de treinta días y pesos nominales. La web permite modificar aportes y horizonte, elegir una tasa bancaria o ingresar una manual, y contrastar evaluaciones. Los datos externos se consultan en ArgentinaDatos y se muestran con fuente y fecha de consulta; una copia local permite reconocer cuándo no hubo una actualización exitosa. La consulta no garantiza la vigencia de la oferta ni la tasa de las renovaciones futuras. La presentación funciona aunque no se abra la web.', calc + '\nRepositorio: ' + repo + '\nArgentinaDatos: https://argentinadatos.com/docs/operations/get-finanzas-tasas-plazo-fijo', 'Si se hace una demostración en vivo, abrir la aplicación previamente. El gráfico de esta diapositiva es editable y usa un caso ilustrativo calculado, independiente de una conexión bancaria.');
}
// 9. Extension: the comparison is purchasing power, not a bank debit.
{
  const s = newSlide('Extensión sobre inflación y poder adquisitivo');
  const f = data.inflationExample.final;
  text(s, 'Escenario supuesto: 10 % mensual durante tres períodos', .7, 1.42, 11.9, .5, { fontSize: 24, color: C.cyan });
  await equation(s, String.raw`\pi_{30}=(1+0{,}10)^{360/365}-1\approx0{,}098565`, .7, 2.22, 8.1, 24);
  text(s, 'Inflación acumulada\nproyectada: 32,58 %', 9.05, 2.18, 3.55, .82, { fontSize: 18, color: C.muted });
  await equation(s, String.raw`D(n)=(1+\pi_{30})^n,\qquad R(n)=\frac{y(n)}{D(n)}`, .7, 3.25, 11.8, 25);
  await equation(s, String.raw`C_{\mathrm{real}}(n)=\sum_{k=1}^{n}\frac{P}{D(k)},\qquad G(n)=R(n)-C_{\mathrm{real}}(n)`, .7, 4.15, 11.8, 23);
  text(s, 'Saldo real', .75, 5.22, 3.4, .6, { fontSize: 19, color: C.muted });
  text(s, money(f.realBalance), .75, 5.92, 3.8, .5, { fontSize: 28, color: C.cyan });
  text(s, 'Aportes ajustados', 4.63, 5.22, 3.7, .6, { fontSize: 19, color: C.muted });
  text(s, money(f.realContributed), 4.63, 5.92, 3.8, .5, { fontSize: 28 });
  text(s, 'Resultado en poder adquisitivo', 8.5, 5.22, 4.1, .6, { fontSize: 18, color: C.muted });
  text(s, money(f.realGain), 8.5, 5.92, 4.1, .5, { fontSize: 28, color: C.orange });
  source(s, 'Pesos de la fecha inicial: 16/11/2026. El resultado no representa una pérdida bancaria nominal.');
  notes(s, 'La extensión distingue cantidad de pesos y poder de compra. Suponemos diez por ciento mensual, no un IPC observado ni un pronóstico. Para enlazar meses calendario y colocaciones de treinta días usamos un mes medio de 365/12 días: pi30=(1+m/100)^(360/365)−1. Al deflactar el saldo final obtenemos 233135,26 pesos de la fecha inicial. Cada aporte se descuenta con el factor de su propio cierre, cuya suma da 249314,91. La diferencia es menos 16179,65 pesos de poder adquisitivo frente a esos aportes ajustados. El saldo nominal del banco sigue siendo 309090.', calc + '\nINDEC. Índice de precios al consumidor. https://www.indec.gob.ar/indec/web/Nivel4-Tema-3-5-31\nArgentinaDatos. Inflación mensual. https://argentinadatos.com/docs/operations/get-finanzas-indices-inflacion', 'El IPC publicado es histórico. La web identifica su mes de referencia y fecha de consulta; no inventa una fecha de publicación si la API no la informa. El escenario de la diapositiva usa inflación constante supuesta. Restar directamente porcentajes de interés e inflación no calcula este resultado.');
}
// 10. Concrete conclusion and professional connection.
{
  const s = newSlide('Conclusiones y práctica profesional');
  text(s, 'La Transformada Z resuelve una regla de actualización discreta', .72, 1.65, 11.8, 1.0, { fontSize: 30, bold: true, color: C.accent });
  text(s, 'La evaluación numérica requiere controlar el redondeo', .72, 3.05, 11.8, .7, { fontSize: 26 });
  text(s, 'Una proyección depende de sus supuestos y de la calidad de sus datos', .72, 4.18, 11.8, .95, { fontSize: 26 });
  text(s, 'En Sistemas: modelar procesos, implementar algoritmos y comunicar sus límites', .72, 5.6, 11.8, .9, { fontSize: 24, color: C.cyan });
  notes(s, 'Obtuvimos una fórmula que permite calcular el saldo de cualquier período del modelo sin recorrer necesariamente todos los pasos. La recurrencia sigue siendo útil para mostrar la evolución completa. La Transformada Z proporciona una solución analítica; su implementación en punto flotante introduce cuestiones de precisión que deben estudiarse. La fórmula supone tasa y aportes constantes, y la proyección financiera no garantiza resultados futuros. Como futuros ingenieros, el trabajo nos conecta con modelar procesos discretos, verificar algoritmos frente a referencias y comunicar con precisión lo que significa cada resultado.', course + '\n' + calc, 'La recurrencia cuesta O(n) para un saldo final y genera la trayectoria. La fórmula cerrada evalúa ese saldo con una cantidad fija de operaciones matemáticas de alto nivel. Para construir una tabla completa de n períodos se siguen generando n valores. La estabilidad numérica de una evaluación es distinta de que un sistema dinámico tenga saldo acotado.');
}
// 11. Visible disclosure, with faithful instructions and a fuller record in notes.
{
  const s = newSlide('Declaración de uso de inteligencia artificial');
  text(s, 'ChatGPT y Codex', .7, 1.55, 5.7, .5, { fontSize: 28, bold: true, color: C.accent });
  text(s, 'Apoyo en el modelo, la derivación,\nla programación y la redacción', .7, 2.38, 5.7, 1.1, { fontSize: 23 });
  text(s, 'Los integrantes deben comprender\ny defender los supuestos y resultados', .7, 4.05, 5.7, 1.2, { fontSize: 22, color: C.muted });
  text(s, 'Extractos literales del pedido', 7.0, 1.55, 5.6, .75, { fontSize: 23, bold: true });
  text(s, '“Comparar ambos resultados y mostrar su diferencia numérica, con tolerancia para errores de punto flotante”.', 7.0, 2.55, 5.6, 1.65, { fontSize: 20 });
  text(s, '“No inventar datos académicos ni resultados de verificaciones todavía no realizadas”.', 7.0, 4.65, 5.6, 1.42, { fontSize: 20, color: C.muted });
  source(s, 'Registro ampliado: docs/AI-USAGE.md y docs/presentation-data.json, disponibles en el repositorio.');
  notes(s, 'Usamos ChatGPT y Codex como apoyo para revisar el modelo, desarrollar la aplicación y preparar estos materiales. Los extractos visibles son pedidos reales. Contrastamos las cuentas con Python y JavaScript; comprender y defender los supuestos sigue siendo responsabilidad de los integrantes.', 'Registro: docs/AI-USAGE.md. Síntesis de la tarea asistida: docs/presentation-data.json, metadata.verificationInstructionSummary; no es cita literal de un prompt. Repositorio: ' + repo, 'La asistencia incluyó derivación, explicación, programación y redacción. No afirmar que el desarrollo manual o la programación se realizaron sin asistencia. No atribuir a la IA la calidad de una prueba independiente que no se haya ejecutado.');
}
// 12. Full, compact APA references. Long URLs are hyperlinks and in the notes.
{
  const s = newSlide('Referencias');
  const refs = [
    ['ArgentinaDatos. (s. f.).\nArgentinaDatos API [Documentación].', 'https://argentinadatos.com/docs/'],
    ['Banco Central de la República Argentina.\n(s. f.). Plazos fijos: claves para invertir tu dinero.', 'https://www.bcra.gob.ar/plazos-fijos-tipos-plazos-y-rentabilidad/'],
    ['Ecma International. (2025). ECMAScript 2025\nlanguage specification. Math.log1p y Math.expm1.', 'https://tc39.es/ecma262/2025/multipage/numbers-and-dates.html#sec-math.expm1'],
    ['Instituto Nacional de Estadística y Censos.\n(s. f.). Índice de precios al consumidor.', 'https://www.indec.gob.ar/indec/web/Nivel4-Tema-3-5-31'],
    ['Macello, A., y Monzoni, F. (2026).\nCapital Discreto [Código fuente]. GitHub.', repo],
    ['Propiedades de la Transformada Z. (s. f.).\n[Tabla de consulta proporcionada para la materia].', null],
    ['Python Software Foundation. (s. f.).\ndecimal: Decimal fixed point and floating point\narithmetic. Python 3.12 documentation.', 'https://docs.python.org/3.12/library/decimal.html'],
    ['Rivara, L., y Vercelli, S. (s. f.). Transformada Z\n[Apunte de Matemática Superior].\nUTN Facultad Regional San Francisco.', null],
    ['Tabla de Algunas Transformadas Z. (s. f.).\n[Tabla de consulta proporcionada para la materia].', null],
  ];
  refs.forEach(([value, url], index) => {
    const col = index < 5 ? 0 : 1; const row = col === 0 ? index : index - 5;
    text(s, value, .7 + col * 6.15, 1.48 + row * 1.06, 5.65, 1.0, { fontSize: 17.2, color: C.muted, valign: 'top', ...(url ? { hyperlink: { url }, underline: false } : {}) });
  });
  notes(s, 'Estas son las fuentes del trabajo. Los apuntes proporcionados para la materia orientaron el desarrollo. Quedamos disponibles para las preguntas.', refs.map(([value, url]) => value + (url ? '\n' + url : '')).join('\n\n'), 'Fecha de consulta: 16 de noviembre de 2026. Esa fecha no demuestra vigencia de una tasa bancaria. La bibliografía respalda la teoría, la evaluación numérica y la identificación de las fuentes de datos.');
}

if (pptx._slides.length !== 12 || timings.reduce((a, b) => a + b, 0) !== 600) throw new Error('Slide count or timing mismatch');
const candidate = path.join(build, 'Capital_Discreto_Coloquio_2026.candidate.pptx');
await pptx.writeFile({ fileName: candidate });
// PptxGenJS 4.0.1 emits unused content-type overrides for nonexistent
// default masters. Remove only those dangling declarations; preserve parts.
const archive = await JSZip.loadAsync(await fs.readFile(candidate));
const contentTypes = await archive.file('[Content_Types].xml').async('string');
archive.file('[Content_Types].xml', contentTypes.replace(/<Override\b[^>]*PartName="([^"]+)"[^>]*\/>/g,
  (entry, part) => archive.file(part.replace(/^\//, '')) ? entry : ''));
// This chart has one category level. Keep its cached points and worksheet
// range in an ordinary string reference for cross-application editing.
for (const entry of Object.values(archive.files).filter(file => /^ppt\/charts\/chart\d+\.xml$/.test(file.name))) {
  let xml = await entry.async('string');
  xml = xml.replace(/<c:multiLvlStrRef>([\s\S]*?)<\/c:multiLvlStrRef>/g, (_match, body) => {
    if ((body.match(/<c:lvl>/g) ?? []).length !== 1) throw new Error('Expected a single category level');
    return '<c:strRef>' + body.replaceAll('c:multiLvlStrCache', 'c:strCache').replace('<c:lvl>', '').replace('</c:lvl>', '') + '</c:strRef>';
  });
  archive.file(entry.name, xml);
}
// Preserve the two actual zero balances at n=0 in the embedded workbook.
// PptxGenJS 4.0.1 otherwise writes empty <v> elements for numeric zero.
const workbookPath = 'ppt/embeddings/Microsoft_Excel_Worksheet1.xlsx';
const workbook = await JSZip.loadAsync(await archive.file(workbookPath).async('nodebuffer'));
let worksheet = await workbook.file('xl/worksheets/sheet1.xml').async('string');
for (const [index, row] of data.nominalSeries.rows.entries()) {
  for (const [column, value] of [['B', row.balance], ['C', row.contributed]]) {
    if (value !== 0) continue;
    const empty = `<c r="${column}${index + 2}"><v></v></c>`;
    if (!worksheet.includes(empty)) throw new Error('Unexpected zero-cell structure');
    worksheet = worksheet.replace(empty, `<c r="${column}${index + 2}"><v>0</v></c>`);
  }
}
workbook.file('xl/worksheets/sheet1.xml', worksheet);
archive.file(workbookPath, await workbook.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
await fs.writeFile(candidate, await archive.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' }));
await fs.writeFile(path.join(build, 'deck-manifest.json'), JSON.stringify({ candidate, slideCount: 12, timings, totalSeconds: 600, font: FONT, slideSize: [W, H], slides: deck }, null, 2));
console.log(JSON.stringify({ candidate, slideCount: 12, totalSeconds: 600 }));
