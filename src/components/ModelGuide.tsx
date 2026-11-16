import { Math } from "./Math";

export function ModelGuide() {
  return (
    <div className="model-guide">
      <header className="slide-intro">
        <p className="eyebrow">Matemática del ahorro</p>
        <h1 className="slide-title">El modelo detrás del ahorro</h1>
        <p className="slide-description">
          El saldo es una señal en tiempo discreto o sucesión: un valor por
          período. Una ecuación en diferencias describe su evolución y la
          Transformada Z permite obtener una expresión para cualquier período.
        </p>
      </header>

      <div className="content-grid">
        <article className="content-card">
          <h2>Primero se generan intereses. Después aportás.</h2>
          <p>
            Partimos de saldo cero. Al cierre de cada período de 30 días, el
            saldo anterior gana intereses y se agrega un aporte fijo.
          </p>
          <div className="formula-panel">
            <Math
              block
            >{String.raw`\begin{gathered}y(n)=(1+i)y(n-1)+P\\n\geq 1,\qquad y(0)=0\end{gathered}`}</Math>
          </div>
          <dl className="variable-list">
            <div>
              <dt>
                <Math>{"y(n)"}</Math>
              </dt>
              <dd>Saldo después del aporte al finalizar el período n.</dd>
            </div>
            <div>
              <dt>
                <Math>{"P"}</Math>
              </dt>
              <dd>Aporte fijo en pesos al cierre de cada período.</dd>
            </div>
            <div>
              <dt>
                <Math>{"i"}</Math>
              </dt>
              <dd>Tasa efectiva de cada colocación de 30 días.</dd>
            </div>
          </dl>
          <p className="callout">
            <Math>{String.raw`y(1)=P`}</Math>: el primer aporte todavía no ganó
            intereses. Un aporte hecho desde el día inicial requeriría otro
            modelo.
          </p>
        </article>

        <article className="content-card">
          <h2>Una tasa para cada período</h2>
          <Math
            block
          >{String.raw`i=\frac{\mathrm{TNA}}{100}\frac{30}{365}`}</Math>
          <p>
            La TNA se expresa como porcentaje anual y se prorratea por 30 días.
            Suponemos que la misma tasa se repite en todas las renovaciones.
          </p>
          <Math
            block
          >{String.raw`\begin{gathered}y(n)=P\frac{(1+i)^n-1}{i}\\i\ne 0\end{gathered}`}</Math>
          <p>
            Si la tasa es cero, el saldo es simplemente la suma de los aportes:{" "}
            <Math>{String.raw`y(n)=Pn`}</Math>.
          </p>
          <p className="muted">
            Cada período dura 30 días. Doce períodos representan 360 días, no un
            año calendario.
          </p>
        </article>
      </div>

      <aside className="callout">
        La proyección conserva la tasa elegida como supuesto; no anticipa tasas
        futuras. El modelo nominal considera reinversión total, sin impuestos ni
        comisiones. El simulador permite agregar un ajuste opcional por
        inflación, cuyas fórmulas se explican al activarlo. La coincidencia
        entre cálculos verifica su consistencia numérica, no las condiciones de
        un producto bancario.
      </aside>

      <details className="content-card model-details">
        <summary>Cómo se obtiene la fórmula con Transformada Z</summary>
        <p>
          Seguimos el procedimiento del apunte de la materia: transformada
          unilateral, linealidad, desplazamiento temporal y método por
          descomposición en fracciones parciales. Definimos a = 1 + i y
          escribimos la entrada mediante el escalón unitario:
        </p>
        <Math
          block
        >{String.raw`\begin{gathered}y(n+1)=ay(n)+Pu(n)\\n\geq 0,\qquad y(0)=0\end{gathered}`}</Math>
        <p className="muted">
          El apunte escribe u(n) y la tabla de pares escribe U[n]: representan
          el mismo escalón, igual a uno para n ≥ 0. La entrada en la transición
          n = 0 se agrega a y(1); no deposita dinero en el saldo inicial y(0).
        </p>
        <ol className="step-list">
          <li>
            <span className="step-number">01</span>
            <div>
              <h3>Definición y linealidad</h3>
              <Math
                block
              >{String.raw`\begin{gathered}Y(z)=\mathcal Z[y(n)]\\=\sum_{n=0}^{\infty}y(n)z^{-n}\end{gathered}`}</Math>
              <p>
                Por linealidad, propiedad 1 de la tabla, transformamos cada
                término:
              </p>
              <Math
                block
              >{String.raw`\begin{gathered}\mathcal Z[ay(n)+Pu(n)]\\=aY(z)+P\mathcal Z[u(n)]\end{gathered}`}</Math>
            </div>
          </li>
          <li>
            <span className="step-number">02</span>
            <div>
              <h3>Aplicar el desplazamiento temporal</h3>
              <p>
                La propiedad 2, con k = 1, incorpora y(0). Para la entrada
                usamos el par del escalón unitario de la tabla de transformadas.
              </p>
              <Math
                block
              >{String.raw`\begin{gathered}\mathcal Z[y(n+1)]\\=z\bigl[Y(z)-y(0)\bigr]\end{gathered}`}</Math>
              <Math block>{String.raw`\mathcal Z[u(n)]=\frac{z}{z-1}`}</Math>
            </div>
          </li>
          <li>
            <span className="step-number">03</span>
            <div>
              <h3>Usar y(0) = 0 y despejar Y(z)</h3>
              <Math
                block
              >{String.raw`\begin{gathered}z[Y(z)-y(0)]\\=aY(z)+\frac{Pz}{z-1}\end{gathered}`}</Math>
              <Math
                block
              >{String.raw`\begin{gathered}(z-a)Y(z)=\frac{Pz}{z-1}\\Y(z)=\frac{Pz}{(z-a)(z-1)}\end{gathered}`}</Math>
            </div>
          </li>
          <li>
            <span className="step-number">04</span>
            <div>
              <h3>Dividir por z y descomponer en fracciones parciales</h3>
              <p>
                Como indica el método del apunte, primero dividimos Y(z) por z.
                Para i ≠ 0, los factores son distintos:
              </p>
              <Math
                block
              >{String.raw`\begin{gathered}\frac{Y(z)}{z}=\frac{P}{(z-a)(z-1)}\\=\frac{A}{z-a}+\frac{B}{z-1}\end{gathered}`}</Math>
              <p>Igualamos los numeradores y obtenemos los coeficientes:</p>
              <Math
                block
              >{String.raw`\begin{gathered}P=A(z-1)+B(z-a)\\A=\frac{P}{i},\qquad B=-\frac{P}{i}\end{gathered}`}</Math>
            </div>
          </li>
          <li>
            <span className="step-number">05</span>
            <div>
              <h3>Multiplicar por z y reconocer los pares</h3>
              <Math
                block
              >{String.raw`\begin{gathered}Y(z)=\frac{P}{i}\left(\frac{z}{z-a}-\frac{z}{z-1}\right)\end{gathered}`}</Math>
              <p>
                La tabla permite reconocer la señal exponencial y el escalón
                unitario:
              </p>
              <Math block>{String.raw`a^n\ \longleftrightarrow\ \frac{z}{z-a}`}</Math>
              <Math block>{String.raw`u(n)\ \longleftrightarrow\ \frac{z}{z-1}`}</Math>
            </div>
          </li>
          <li>
            <span className="step-number">06</span>
            <div>
              <h3>Aplicar la anti-transformada Z</h3>
              <p>
                Por linealidad de la transformada inversa y con u(n) = 1 para
                n ≥ 0, recuperamos la sucesión de saldos:
              </p>
              <Math
                block
              >{String.raw`\begin{gathered}y(n)=\frac{P}{i}(a^n-1)\\\boxed{y(n)=P\frac{(1+i)^n-1}{i}}\end{gathered}`}</Math>
            </div>
          </li>
        </ol>
        <p>
          <strong>Caso i = 0.</strong> Los factores coinciden y la descomposición
          anterior no se aplica. Reconocemos el par de la rampa unitaria,
          presente en la tabla de transformadas:
        </p>
        <Math
          block
        >{String.raw`n\ \longleftrightarrow\ \frac{z}{(z-1)^2}`}</Math>
        <Math
          block
        >{String.raw`Y(z)=\frac{Pz}{(z-1)^2}\quad\Longrightarrow\quad y(n)=Pn`}</Math>
        <p className="muted">
          <strong>Condición de convergencia.</strong> La tabla indica un radio R:
          la serie transformada converge cuando <Math>{String.raw`|z|>R`}</Math>.
          Para P &gt; 0 e i &gt; 0, R = 1 + i; si i = 0, R = 1. Esto describe
          la convergencia de la serie, no la existencia de un saldo límite.
          Si P = 0, la sucesión es cero.
        </p>
        <p>
          <strong>Comprobación del valor inicial.</strong> La propiedad 5 de la
          tabla confirma la condición de partida:
        </p>
        <Math
          block
        >{String.raw`y(0)=\lim_{z\to\infty}Y(z)=0`}</Math>
        <p className="muted">
          Para P &gt; 0 e i ≥ 0, el saldo crece sin un valor final finito.
          La tabla de transformadas no numera sus pares; los números de
          propiedades mencionados corresponden a la tabla de propiedades.
        </p>
        <p className="muted">
          Guía de lectura: apunte, páginas impresas 2–3 para señales discretas,
          4–6 para definición y propiedades, y 8–9 para transformada inversa y
          descomposición en fracciones parciales.
        </p>
        <p className="muted">
          La Transformada Z obtiene aquí una solución analítica de la
          recurrencia. Las diferencias entre sus evaluaciones en computadora
          corresponden a redondeo, sin error de discretización.
        </p>
      </details>

      <details className="content-card model-details">
        <summary>Un ejemplo que se puede comprobar a mano</summary>
        <p>
          Caso didáctico fijo, independiente de los controles: P = $100.000, TNA
          = 36,5 % y tres períodos. Esta tasa se eligió para obtener i = 3 %; no
          es una oferta bancaria vigente.
        </p>
        <div className="content-grid">
          <div>
            <h3>Recurrencia</h3>
            <Math
              block
            >{String.raw`\begin{aligned}y(1)&=1{,}03\cdot 0+100\,000\\&=100\,000\end{aligned}`}</Math>
            <Math
              block
            >{String.raw`\begin{aligned}y(2)&=1{,}03\cdot 100\,000+100\,000\\&=203\,000\end{aligned}`}</Math>
            <Math
              block
            >{String.raw`\begin{aligned}y(3)&=1{,}03\cdot 203\,000+100\,000\\&=309\,090\end{aligned}`}</Math>
          </div>
          <div>
            <h3>Fórmula obtenida con Z</h3>
            <Math
              block
            >{String.raw`\begin{aligned}y(3)&=100\,000\frac{1{,}03^3-1}{0{,}03}\\&=309\,090\end{aligned}`}</Math>
            <p>
              Total aportado: <strong>$300.000</strong>.
            </p>
            <p>
              Intereses acumulados: <strong>$9.090</strong>.
            </p>
            <p className="muted">
              El primer aporte ganó dos períodos; el segundo ganó uno; el
              tercero todavía no ganó intereses.
            </p>
          </div>
        </div>
      </details>

      <details className="content-card model-details">
        <summary>Fuentes y uso de inteligencia artificial</summary>
        <p>
          El apunte y las dos hojas de consulta proporcionados para la materia
          son la referencia principal de la notación y del procedimiento. La
          lectura de Siebert disponible en MIT es complementaria. El modelo
          financiero y su estudio numérico son aplicaciones de esta herramienta.
        </p>
        <p className="muted">
          Referencias de esta versión, consultadas el 16 de noviembre de 2026.
          Las fechas de consulta no indican la vigencia de las tasas.
        </p>
        <ul className="reference-list">
          <li>
            ArgentinaDatos. (s. f.).{" "}
            <a
              href="https://argentinadatos.com/docs/operations/get-finanzas-tasas-plazo-fijo"
              target="_blank"
              rel="noreferrer"
            >
              <em>Plazo fijo</em>
            </a>{" "}
            [Documentación de API]. Servicio independiente que reúne datos
            públicos; no es una API oficial del BCRA.
          </li>
          <li>
            Banco Central de la República Argentina. (s. f.).{" "}
            <a
              href="https://www.bcra.gob.ar/plazos-fijos-tipos-plazos-y-rentabilidad/"
              target="_blank"
              rel="noreferrer"
            >
              <em>Plazos fijos: claves para invertir tu dinero.</em>
            </a>{" "}
            Contexto de las colocaciones y renovaciones.
          </li>
          <li>
            Ecma International. (2025).{" "}
            <a
              href="https://tc39.es/ecma262/2025/multipage/numbers-and-dates.html#sec-math.expm1"
              target="_blank"
              rel="noreferrer"
            >
              <em>ECMAScript 2025 language specification.</em>
            </a>{" "}
            Secciones Math.expm1 y Math.log1p, utilizadas para la evaluación
            numérica estable.
          </li>
          <li>
            <em>Propiedades de la Transformada Z.</em> (s. f.). [Hoja de consulta
            proporcionada para la materia]. Archivo: <code>Propiedades de la
            Transformada Z.pdf</code>. Propiedades 1, 2 y 5.
          </li>
          <li>
            Rivara, L., &amp; Vercelli, S. (s. f.). <em>Transformada Z</em> [Apunte
            de Matemática Superior]. Universidad Tecnológica Nacional, Facultad
            Regional San Francisco. Archivo: <code>Apunte 5 - Transformada Z.pdf</code>.
            Páginas impresas 2–3, 4–6 y 8–9.
          </li>
          <li>
            Siebert, W. M. (s. f.).{" "}
            <a
              href="https://introcontrol.mit.edu/_static/fall24/extras/siebert8.pdf"
              target="_blank"
              rel="noreferrer"
            >
              <em>The unilateral Z-transform and its applications</em>
            </a>{" "}
            (cap. 8, sec. 8.2, p. 239). Lectura complementaria disponible en MIT.
          </li>
          <li>
            <em>Tabla de Algunas Transformadas Z.</em> (s. f.). [Hoja de consulta
            proporcionada para la materia]. Archivo: <code>Tabla de Algunas
            Transformadas Z.pdf</code>. Pares del escalón unitario, de la rampa
            unitaria y de la señal exponencial.
          </li>
        </ul>
        <h3>Apoyo de IA</h3>
        <p>
          ChatGPT/Codex apoyó la revisión de la derivación, la organización de
          las explicaciones y el desarrollo de la herramienta. El registro de
          instrucciones y decisiones se conserva en{" "}
          <code>docs/AI-USAGE.md</code>, dentro del proyecto.
        </p>
      </details>
    </div>
  );
}
