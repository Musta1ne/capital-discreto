# Alineación de la explicación con los materiales del curso

Este mapa relaciona el vocabulario y la derivación del ahorro con los tres PDF proporcionados para el coloquio. El apunte orienta el procedimiento y las dos tablas permiten reconocer propiedades y pares. La aplicación continúa destinada al coloquio de Análisis Numérico; el material se atribuye a Matemática Superior tal como indica su portada.

## Materiales y localización

Las páginas del PDF se cuentan desde uno, incluida la portada. En el apunte la página impresa 1 coincide con la página 2 del PDF, por lo que se indican ambas referencias para evitar confusiones.

| Material | Identificación visible | Referencia utilizada |
| --- | --- | --- |
| `Apunte 5 - Transformada Z.pdf` | Matemática Superior, UTN Facultad Regional San Francisco; docente Ing. Laura Rivara y ayudante Ing. Sofía Vercelli; diez páginas de PDF | Conceptos, nombres de propiedades y procedimiento de inversión |
| `Propiedades de la Transformada Z.pdf` | Tabla de una página con filas numeradas | Filas 1, 2 y 5; los nombres de las propiedades se toman del apunte |
| `Tabla de Algunas Transformadas Z.pdf` | Tabla de una página sin numeración de entradas | Pares del escalón, la rampa y la exponencial |

No se identifica una fecha de publicación visible. Las referencias usan «s. f.» y no extraen autoría o fecha de metadatos del archivo. Los originales se identifican por nombre; no se publican rutas personales ni se incorporan copias a los recursos públicos de la web.

## Correspondencia con la explicación

| Concepto o paso en la herramienta | Fuente y ubicación | Aplicación al ahorro |
| --- | --- | --- |
| Señal en tiempo discreto o sucesión | Apunte, páginas impresas 2–3; PDF 3–4 | y(n) es el saldo después del aporte al cierre del período n |
| Escalón unitario, rampa unitaria y exponencial a^n | Apunte, página impresa 3; PDF 4 | Entrada constante de aportes y pares para invertir la transformada |
| Definición Z[x(n)] = Σ x(n)z^(−n), n desde cero | Apunte, páginas impresas 4–5; PDF 5–6 | Y(z) = Z[y(n)] es la transformada unilateral de la sucesión del saldo |
| Linealidad | Apunte, página impresa 5; PDF 6; tabla de propiedades, fila 1 | Transformar ay(n) + Pu(n) como aY(z) + PZ[u(n)] |
| Desplazamiento temporal | Apunte, página impresa 6; PDF 7; tabla de propiedades, fila 2 | Z[y(n+1)] = z[Y(z)−y(0)] incorpora la condición inicial |
| Anti-transformada Z o transformada Z inversa | Apunte, página impresa 8; PDF 9 | Recuperar la sucesión y(n) desde Y(z) |
| Método por descomposición en fracciones parciales | Apunte, páginas impresas 8–9; PDF 9–10 | Dividir Y(z) por z, descomponer, multiplicar por z y reconocer pares |
| Teorema del valor inicial | Tabla de propiedades, fila 5 | Comprobar y(0) = lim Y(z) = 0 al hacer z → ∞ |
| Pares del escalón, la rampa y la exponencial | Tabla de Algunas Transformadas Z, página única | u(n) ↔ z/(z−1), n ↔ z/(z−1)^2 y a^n ↔ z/(z−a), para las sucesiones causales correspondientes |

La tabla de propiedades numera las filas pero no imprime «linealidad» o «desplazamiento temporal» como nombres. Esos términos se atribuyen al apunte. La tabla de pares no numera sus entradas: no corresponde denominar sus pares «fórmula 7» o «fórmula 8» a partir de una numeración de otro documento.

## Convenciones de notación

Se escribe y(n) para la sucesión de saldos y Y(z) para su transformada. Las expresiones de poder adquisitivo también usan paréntesis, como R(n) y G(n). Esta elección es de notación matemática; no cambia los índices de arreglos ni los identificadores del código.

El apunte usa u(n) para el escalón unitario, mientras que la tabla lo escribe U[n]. Se explicita la equivalencia para evitar leer la letra mayúscula de la tabla como una transformada distinta. Para n ≥ 0 ambas representan la sucesión constante uno.

El aporte del primer período se realiza al cierre. La ecuación que se transforma es y(n+1) = ay(n) + Pu(n), para n ≥ 0, con a = 1 + i e y(0) = 0. El escalón describe la entrada constante; no agrega un aporte al saldo inicial.

## Derivación que sigue el procedimiento del apunte

Por linealidad y desplazamiento temporal:

```text
Z[y(n)] = Y(z)
Z[y(n+1)] = z[Y(z) − y(0)]
Z[u(n)] = z/(z−1)
z[Y(z) − y(0)] = aY(z) + Pz/(z−1)
```

Como y(0) = 0:

```text
(z−a)Y(z) = Pz/(z−1)
Y(z) = Pz/((z−a)(z−1))
```

Para i ≠ 0, a ≠ 1. Se divide por z antes de descomponer:

```text
Y(z)/z = P/((z−a)(z−1))
       = A/(z−a) + B/(z−1)
P = A(z−1) + B(z−a)
A = P/(a−1) = P/i
B = P/(1−a) = −P/i
```

Después se multiplica por z y se reconocen los pares de la tabla:

```text
Y(z) = (P/i)[z/(z−a) − z/(z−1)]
y(n) = (P/i)(a^n − 1)
     = P((1+i)^n − 1)/i
```

Si i = 0, los factores coinciden y no se aplica la descomposición anterior. Se reconoce el par de la rampa:

```text
Y(z) = Pz/(z−1)^2
y(n) = Pn
```

El caso inicial satisface y(0) = 0 y el primer cierre y(1) = P. El teorema del valor inicial confirma que lim Y(z) = 0 cuando z → ∞. Para P > 0 e i ≥ 0, el saldo crece sin un valor final finito; no se utiliza un teorema de valor final para atribuirle un límite finito.

## Alcance de la adaptación

Los PDF fundamentan la notación, las propiedades y el método de inversión. El modelo financiero, la comparación de precisión en punto flotante y el ajuste por inflación son aplicaciones del proyecto; no se atribuyen a los apuntes como ejemplos ya incluidos en ellos. La referencia de Siebert alojada por MIT permanece como lectura complementaria.

La adaptación de contenido no cambia la recurrencia ni los motores nominal y de inflación.

## Verificación de la adaptación

- Compilación de producción y comprobación de tipos completadas con `npm run build`.
- Las 38 expresiones estáticas de KaTeX de la interfaz se renderizaron sin errores.
- Se comprobaron seis evaluaciones de la igualdad de fracciones parciales, con i = 0,03; 0,1 y 0,5 y z = 3 y 5. La deducción algebraica general está desarrollada arriba.
- En el navegador se verificaron los seis pasos, los términos del apunte y las siete referencias de la sección de fuentes.
- En la vista móvil de 390 píxeles no se observaron desbordamientos de página ni de las fórmulas del modelo, ni errores de KaTeX.

Estas comprobaciones verifican la adaptación del contenido y su presentación. No se agregaron ni se volvieron a ejecutar pruebas de los motores matemáticos, que no se modificaron.

## Referencias

- *Propiedades de la Transformada Z*. (s. f.). [Tabla suministrada para el coloquio]. Archivo: `Propiedades de la Transformada Z.pdf`.
- Rivara, L., & Vercelli, S. (s. f.). *Transformada Z* [Apunte de Matemática Superior]. Universidad Tecnológica Nacional, Facultad Regional San Francisco. Archivo: `Apunte 5 - Transformada Z.pdf`.
- *Tabla de Algunas Transformadas Z*. (s. f.). [Tabla suministrada para el coloquio]. Archivo: `Tabla de Algunas Transformadas Z.pdf`.
