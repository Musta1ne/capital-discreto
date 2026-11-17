# Capital discreto

Herramienta web de ahorro con aportes al cierre, tasas bancarias consultadas en una fuente externa y explicación del modelo mediante Transformada Z. El proyecto acompaña un coloquio de Análisis Numérico de Ingeniería en Sistemas de la UTN; la presentación académica se entrega como archivo PowerPoint separado de la web.

Integrantes: **Agustin Macello** y **Francisco Monzoni**. Repositorio: [capital-discreto en GitHub](https://github.com/Musta1ne/capital-discreto).

La aplicación integra el simulador, la consulta de tasas de varias entidades, el modelo matemático, la comparación de precisión numérica y un ajuste opcional por inflación, desactivado por defecto. La lógica de cálculo y la adaptación de datos externos están separadas de la interfaz.

## Ejecutar

Requiere Node.js 22.14 o superior y npm.

```sh
npm install
npm run dev
```

Vite indica la dirección local para abrir en el navegador.

```sh
npm test
npm run build
npm run preview
```

`npm test` ejecuta Vitest. `npm run build` comprueba los tipos y produce `dist/`; `npm run preview` sirve esa compilación, por lo que requiere ejecutar antes el build. También está disponible `npm run test:watch` para desarrollo.

La aplicación se ejecuta localmente en esta fase, sin backend ni base de datos y sin publicación en un hosting.

## Presentación del coloquio

Archivo: [Capital_Discreto_Coloquio_2026.pptx](output/presentations/Capital_Discreto_Coloquio_2026.pptx).

La versión actual de la presentación contiene **10 diapositivas**, con guiones del expositor y referencias. El gráfico de evolución y las fórmulas se incluyen como imágenes. El generador conserva la versión base de doce diapositivas, con tiempos, conclusiones y declaración de uso de IA; sus expresiones LaTeX están en `scripts/create_presentation.mjs`.

Los importes, las tasas y el supuesto de inflación mensual del 10 % empleados en el archivo son **datos didácticos**, no ofertas bancarias ni valores vigentes del IPC. La presentación usa casos reproducibles y no consulta las APIs para completar sus ejemplos.

### Reproducir los cálculos y generar el archivo

Se requiere Python 3.11 o superior, además de Node.js. Desde la raíz del repositorio:

```sh
python scripts/verify_colloquium.py
npm install --prefix tmp/presentation-build --no-save pptxgenjs@4.0.1 sharp mathjax-full jszip
node scripts/create_presentation.mjs
```

El primer comando guarda la evidencia en [docs/presentation-data.json](docs/presentation-data.json). Su ejecución real completó **41 comprobaciones** sobre los ejemplos, las evaluaciones de Python y las funciones TypeScript del producto. Utiliza la biblioteca estándar de Python y referencias `Decimal`; las referencias de recurrencias decimales finitas son exactas para los casos comprobados y la referencia de inflación es una evaluación aproximada de alta precisión.

Estas 41 comprobaciones pertenecen a la preparación del coloquio y no se cuentan como pruebas nuevas de la aplicación. Las dependencias del generador se instalan exclusivamente en `tmp/presentation-build`, fuera de las dependencias de la web.

El generador escribe `tmp/presentation-build/Capital_Discreto_Coloquio_2026.candidate.pptx` y un manifiesto con las notas y los tiempos. Regenerar ese candidato no reemplaza automáticamente el archivo de entrega de `output/presentations/`.

La versión base se verificó estructuralmente y se revisaron sus doce diapositivas renderizadas con LibreOffice 26.2.7. Se comprobaron las doce notas y la correspondencia entre los 26 valores del gráfico, su caché y el libro de datos incrustado. Esas verificaciones corresponden a la versión base, previa a los cambios de la presentación actual. Los PDF y las imágenes utilizados para esa revisión permanecen en `tmp/`.

## Informe del coloquio

El informe sigue la plantilla de la materia y se entrega en [Word](output/documents/Capital_Discreto_Informe_2026.docx) y [PDF](output/pdf/Capital_Discreto_Informe_2026.pdf). Tiene ocho páginas, ecuaciones nativas de Word, resolución paso a paso, un fragmento de Python, tablas, un gráfico, análisis de precisión, ajuste por inflación, referencias y declaración de uso de IA. La portada incluye los datos institucionales y los correos de ambos integrantes.

Se revisaron las ocho páginas renderizadas. La actualización del correo de Francisco conservó el resto del documento; las páginas 2 a 8 del PDF permanecieron idénticas en la comparación visual.

## Uso

La interfaz tiene cuatro vistas continuas, sin navegación de diapositivas ni atajos especiales de presentación:

- **Simulador**: aporte por período, cantidad de períodos y TNA manual o tomada de una entidad; saldo final, aportes, intereses, gráfico y tabla.
- **Tasas bancarias**: entidades disponibles, tasas informadas para clientes y no clientes, estado de la consulta y selección de una tasa para el simulador.
- **Modelo matemático**: supuestos, línea de tiempo, recurrencia y derivación de la solución mediante Transformada Z.
- **Precisión**: contraste entre la recurrencia, la fórmula usual y su evaluación estable para estudiar errores de punto flotante.

La herramienta proyecta usando una tasa constante elegida en el momento de la consulta. No registra renovaciones efectivamente realizadas ni aplica tasas diferentes en cada período. Una consulta nueva de tasas no convierte una proyección anterior en un historial real.

## Datos bancarios

Se eligió **ArgentinaDatos**, un proveedor independiente, como fuente externa para comparar varias entidades. No es una API del BCRA ni de los bancos.

- Endpoint: `GET https://api.argentinadatos.com/v1/finanzas/tasas/plazoFijo`.
- Documentación: https://argentinadatos.com/docs/operations/get-finanzas-tasas-plazo-fijo
- Condiciones de uso: https://argentinadatos.com/docs/uso

La fuente se consulta directamente desde el navegador y requiere conexión a Internet, disponibilidad del servicio y que el proveedor permita CORS. No se necesitan credenciales. Las fallas de conexión o cambios en el proveedor pueden impedir obtener nuevas tasas; la opción de TNA manual permanece disponible.

### Interpretación y fecha

Las tasas del nivel principal del endpoint corresponden al plazo fijo a 30 días. Se convierten las fracciones a porcentajes: por ejemplo, `tnaClientes: 0.1925` representa una TNA de `19,25 %`. Los datos anidados de otros plazos no se utilizan. Un `tnaNoClientes` igual a cero se interpreta como **sin dato**, no como una oferta de tasa cero.

La API no informa la fecha de publicación o vigencia de la tasa. La interfaz distingue **“Consultado el…”** de **“La fuente no informa fecha de vigencia”**. La hora de consulta no demuestra que el banco haya actualizado una oferta en ese momento: consultar hoy no garantiza que una tasa siga vigente.

Las tasas pueden depender de la entidad, el monto, la condición de cliente y otras condiciones del producto. Una tasa informada por el proveedor debe contrastarse con la entidad antes de atribuirle el carácter de oferta aplicable a un caso particular.

### Actualización y copia local

Al abrir la aplicación o revisitarla se consulta la fuente si no hay datos o la copia tiene al menos 3 horas. Mientras la pestaña permanece visible, se comprueba cada minuto si se alcanzó esa antigüedad para consultar nuevamente. También se comprueba al volver a la pestaña o recuperar la conexión.

Se conserva una copia en `localStorage` durante un máximo de 7 días para consultar sin conexión, identificada expresamente como copia local con su fecha de consulta. La copia deja de utilizarse al superar ese límite, incluso si la pestaña permaneció abierta.

La aplicación no puede consultar datos mientras está cerrada. La copia local no acredita la vigencia de una tasa y no reemplaza una consulta exitosa. La TNA manual también permite trabajar sin conexión.

## Modelo matemático

Se parte de saldo cero. Al cierre de cada período se calculan los intereses sobre el saldo anterior y después se incorpora el aporte P:

```text
y(0) = 0
y(n) = (1 + i) y(n−1) + P, para n ≥ 1
i = (TNA / 100) × (30 / 365)
```

Por tanto, `y(1) = P`: el primer aporte todavía no generó intereses. Se supone reinversión del saldo completo, TNA constante y aportes constantes al vencimiento. Cada período dura 30 días; doce períodos representan 360 días, no un año calendario.

La Transformada Z proporciona una solución analítica de la recurrencia:

```text
y(n) = P × ((1 + i)^n − 1) / i, si i ≠ 0
y(n) = P × n, si i = 0
```

La tasa elegida se mantiene constante en todos los períodos de la proyección; esto es un supuesto y no una garantía sobre renovaciones futuras. El modelo no permite agregar dinero a un plazo fijo antes de su vencimiento ni incorpora impuestos o variaciones de TNA. El ajuste opcional por inflación convierte los resultados nominales a poder adquisitivo de una fecha base, sin modificar esta recurrencia.

### Notación y procedimiento de los apuntes

La explicación usa el vocabulario de los tres PDF suministrados: **señal en tiempo discreto o sucesión**, **escalón unitario**, **linealidad**, **desplazamiento temporal**, **anti-transformada Z** y **método por descomposición en fracciones parciales**. Se escribe `y(n)` para la sucesión de saldos y `Y(z) = Z[y(n)]` para su transformada; no se confunde el saldo nominal con su transformada.

El escalón se escribe `u(n)` como en el apunte. La tabla lo representa como `U[n]`; ambas notaciones identifican aquí la misma sucesión. Para incorporar el aporte sin adelantarlo al día inicial se transforma:

```text
y(n+1) = a y(n) + P u(n), n ≥ 0, a = 1 + i, y(0) = 0
Z[y(n)] = Σ y(n) z^(−n), para n = 0..∞
z[Y(z) − y(0)] = aY(z) + Pz/(z−1)
Y(z) = Pz / ((z−a)(z−1))
```

El procedimiento de fracciones parciales sigue el apunte: dividir `Y(z)` por `z`, descomponer, multiplicar por `z` y reconocer los pares de la tabla. Para `i ≠ 0`:

```text
Y(z)/z = A/(z−a) + B/(z−1), A = P/i, B = −P/i
Y(z) = (P/i)[z/(z−a) − z/(z−1)]
y(n) = (P/i)(a^n − 1)
```

Con tasa cero se usa el par de la rampa unitaria: `Y(z) = Pz/(z−1)^2` y `y(n) = Pn`. El teorema del valor inicial comprueba `y(0) = lim Y(z) = 0` cuando `z → ∞`. Con aportes positivos y tasa no negativa, el saldo no tiene valor final finito.

El [mapa de alineación con los apuntes](docs/COURSE-ALIGNMENT.md) identifica páginas, filas y pares concretos. El material se titula *Matemática Superior*; esa atribución se conserva sin cambiar la materia del coloquio, Análisis Numérico. El texto del MIT queda como referencia complementaria. La adaptación se verificó con compilación, 38 expresiones de KaTeX sin errores y revisión del desarrollo en escritorio y móvil; los motores de cálculo permanecen iguales.

### Parámetros de cálculo

| Parámetro | Valor inicial del código | Valores admitidos por la capa matemática |
| --- | ---: | --- |
| Aporte al cierre | $100.000 | De $0 a $1.000.000.000 |
| TNA manual | 30 % | De 0 % a 1.000 % |
| Períodos de 30 días | 12 | Enteros de 0 a 60 |

El período cero sirve para representar y probar la condición inicial; el simulador usa de 1 a 60 períodos. La TNA manual inicial del 30 % en la configuración es un **supuesto didáctico**, sin atribución bancaria ni fecha de vigencia. Al cambiar desde una tasa bancaria al modo manual, se precarga la tasa seleccionada para poder editarla. Las tasas tomadas de la consulta externa se identifican con su fuente y su fecha de consulta.

### Caso manual

Para `P = $100.000`, `TNA = 36,5 %` e `i = 0,03`:

| Período | Saldo |
| --- | ---: |
| 0 | $0 |
| 1 | $100.000 |
| 2 | $203.000 |
| 3 | $309.090 |

En el período 3 se aportaron $300.000 y se acumularon $9.090 de intereses. La tasa del caso manual es sintética y facilita comprobar las cuentas.

## Ajuste opcional por inflación

El ajuste está desactivado por defecto para conservar la experiencia nominal. Al activarlo se puede usar el último IPC mensual publicado disponible en la fuente o una estimación mensual ingresada manualmente. En ambos casos la interfaz mantiene ese porcentaje constante durante la proyección; no ofrece una secuencia de inflaciones variables ni un registro de inflación efectivamente observada en cada período futuro.

El último IPC publicado es un dato histórico, identificado con su **mes de referencia**. Usarlo como supuesto constante no lo convierte en un pronóstico ni en la inflación del mes actual. La selección manual también es un escenario supuesto.

### Fuente y fechas del IPC

Se consulta ArgentinaDatos como proveedor independiente de la serie mensual:

- Endpoint: `GET https://api.argentinadatos.com/v1/finanzas/indices/inflacion`.
- Documentación: https://argentinadatos.com/docs/operations/get-finanzas-indices-inflacion
- Fuente estadística oficial para contrastar la serie: https://www.indec.gob.ar/indec/web/Nivel4-Tema-3-5-31

Se utiliza el IPC **mensual**, no la variación interanual. El endpoint devuelve un arreglo de objetos con `fecha` y `valor`: `valor` ya es un porcentaje mensual, de modo que `2.2` significa `2,2 %`; no se multiplica por cien. `fecha` identifica el mes al que corresponde el dato y no su fecha de publicación.

El adaptador valida la serie completa y selecciona el último mes de referencia sin asumir que la respuesta está ordenada. Si una fila tiene fecha imposible, corresponde al mes actual o futuro, o presenta un dato no válido, se rechaza la respuesta: no se retrocede silenciosamente a un mes anterior. El momento de consulta se muestra por separado. Si la fuente no informa una fecha de actualización, se declara no disponible; un eventual metadato de actualización del recurso tampoco equivale a la fecha de publicación oficial del INDEC.

La consulta de IPC requiere conexión y CORS, como la de tasas. Tiene una copia local y un estado de actualización **independientes**: referencia de 3 horas para consultar nuevamente y máximo de 7 días para utilizar una copia, con indicación de que proviene de almacenamiento local. Si la fuente no está disponible, la estimación manual permite completar el escenario. No se consulta mientras la aplicación está cerrada.

### Períodos y poder adquisitivo

Para convertir el porcentaje mensual `m` a una fracción de inflación de 30 días se adopta un mes promedio de `365/12` días:

```text
π₃₀ = (1 + m/100)^(30/(365/12)) − 1
    = (1 + m/100)^(360/365) − 1
```

Esta convención armoniza el dato mensual con los períodos bancarios de 30 días; no supone que todos los meses calendario duren 30 días.

La fecha base se captura al abrir la proyección. Los valores reales se expresan en pesos de esa fecha, usando el deflactor acumulado:

```text
D(0) = 1
D(n) = ∏(1 + π(k)), para k = 1..n
R(n) = y(n) / D(n)
C(n) = Σ(ΔA(k) / D(k)), para k = 1..n
G(n) = R(n) − C(n)
```

`y(n)` es el saldo nominal y `ΔA(k)` es el aporte nominal realizado al cierre del período k. `R(n)` es el saldo en poder adquisitivo de la fecha base; `C(n)` es la suma de los aportes, cada uno convertido a pesos de la fecha base usando el deflactor de su propio cierre; y `G(n)` es el **resultado en poder adquisitivo** frente a esos aportes ajustados.

La tarjeta y la tabla usan esa etiqueta neutral tanto para valores positivos como negativos o cero. La aclaración visible identifica la fecha base y explica que se compara poder adquisitivo bajo los supuestos de la proyección: un importe negativo no representa un débito ni una pérdida bancaria nominal. Es posible que el saldo nominal aumente y que este resultado sea negativo. La fórmula y los importes calculados se mantienen.

No se descuenta el total nominal `Pn` con el deflactor final: los aportes se hicieron en distintos momentos y cada uno requiere `D(k)`. Comparar saldo real con aportes nominales o descontar todos los aportes como si se hubieran realizado al último cierre daría otra magnitud.

La capa matemática admite una secuencia de fracciones de inflación de 30 días para evaluar y probar el deflactor; la interfaz de esta fase solo utiliza escenarios de inflación constante. El ajuste no modifica la selección de banco ni los cálculos nominales existentes.

## Precisión numérica

La evaluación iterativa aplica únicamente la recurrencia. La evaluación directa estable usa la fórmula cerrada reescrita como:

```ts
contribution * (Math.expm1(periods * Math.log1p(periodRate)) / periodRate)
```

El caso `periodRate === 0` se resuelve por separado. `Math.log1p` y `Math.expm1` reducen la pérdida de precisión de la fórmula usual para tasas próximas a cero. Ninguna evaluación en punto flotante se considera exacta para todos los casos.

No se redondean saldos a centavos después de cada período. La comparación de resultados A y B considera que coinciden dentro de tolerancia cuando:

```text
|A − B| ≤ 10⁻⁶ + 10⁻¹² × max(|A|, |B|)
```

La coincidencia verifica consistencia entre evaluaciones; no demuestra por sí sola fidelidad a un producto bancario ni mide el error frente a una verdad exacta. Las diferencias entre evaluaciones de esta recurrencia corresponden a redondeo, no a error de discretización.

## Organización del código

- `src/App.tsx`: composición de las vistas, resumen y tabla de resultados.
- `src/components/SimulationPanel.tsx`: controles de los parámetros del simulador.
- `src/components/SavingsChart.tsx`: evolución del saldo y comparación sin intereses.
- `src/components/BankRates.tsx`: consulta y selección de tasas bancarias.
- `src/components/PrecisionLab.tsx`: comparación de evaluaciones numéricas.
- `src/components/ModelGuide.tsx`: supuestos y desarrollo del modelo matemático.
- `src/components/Math.tsx`: fórmulas con KaTeX.
- `src/components/InflationControls.tsx` y `src/components/InflationResults.tsx`: opción de inflación y resultados en poder adquisitivo.
- `src/hooks/useBankRates.ts`: estado y actualización de las tasas.
- `src/hooks/useInflation.ts`: consulta y copia local independientes del IPC.
- `src/lib/savings.ts` y `src/lib/savings.test.ts`: cálculos y pruebas.
- `src/lib/rates.ts` y `src/lib/rates.test.ts`: adaptación, validación y copia local de las tasas, con sus pruebas.
- `src/lib/inflation.ts` y `src/lib/inflation.test.ts`: deflactores, aportes reales y pruebas del ajuste.
- `src/lib/inflationData.ts` y `src/lib/inflationData.test.ts`: adaptación y copia local de la serie mensual, con sus pruebas.
- `CONTEXT.md`: glosario del dominio.
- `docs/AI-USAGE.md`: uso de IA, extractos de prompts y cambios de alcance.
- `docs/COURSE-ALIGNMENT.md`: correspondencia entre la explicación, el apunte y las dos tablas suministradas.
- `scripts/verify_colloquium.py` y `docs/presentation-data.json`: cálculo reproducible y evidencia de los ejemplos de la presentación.
- `scripts/create_presentation.mjs`: generador del PowerPoint con dependencias privadas de preparación.
- `output/presentations/Capital_Discreto_Coloquio_2026.pptx`: presentación de 12 diapositivas con notas.

Se usan React, TypeScript, Vite, Tailwind CSS, Recharts, KaTeX y Vitest. La interfaz está en español y los identificadores del código en inglés.

## Verificación

Verificaciones realizadas el 16 de noviembre de 2026, incluida la fase de inflación:

- `npm test`: **313 pruebas aprobadas**: 97 de cálculos de ahorro, 83 de adaptación de tasas, 57 del motor de inflación y 76 de adaptación del IPC.
- `npm run build`: comprobación de tipos y compilación de producción completadas correctamente. Vite mantiene una advertencia sobre el tamaño del paquete JavaScript; la compilación termina correctamente.
- Consulta real desde el navegador: respuesta de 33 entidades recibida mediante CORS. Es la cantidad observada durante esa consulta, no un total fijo garantizado por el proveedor.
- Caso manual en el navegador: aporte de $100.000, TNA de 36,5 % y 3 períodos produjeron saldo de $309.090 e intereses de $9.090.
- Revisión visual en anchos de 1.289, 1.440 y 390 píxeles, sin desbordamiento horizontal observado.
- Once comprobaciones de navegador aprobadas: carga real, selección por condición de cliente, cambio de banco, caso manual, tasa cero, entradas inválidas, búsqueda de entidad, experimento de cancelación, fórmulas y vistas móviles, conservación de la copia ante una falla simulada del proveedor y vencimiento de esa copia en una pestaña abierta.

Las pruebas de cálculo incluyen condición inicial y aporte al cierre, casos manuales conocidos, tasa y aporte cero, conversión de TNA, comparación por período, tasas cercanas a cero y entradas fuera del dominio. Estas verificaciones no acreditan vigencia de tasas bancarias ni sustituyen una comprobación de las condiciones de la entidad.

También se completaron doce comprobaciones de interfaz del ajuste por inflación. Se verificó que desactivarlo conserva el saldo nominal de $309.090 del caso manual; que una inflación manual de cero iguala resultados nominales y reales; que un supuesto de 10 % mensual produce la pérdida real correspondiente al descontar cada aporte en su cierre; y que con un único aporte al cierre del período 1 la ganancia real es cero. Se revisaron deflación, entrada manual inválida sin alterar el saldo nominal, tabla ampliada a diez columnas y vista móvil de 390 píxeles sin desbordamiento horizontal ni errores de KaTeX observados. Las pruebas de fallas simuladas comprobaron la conservación de una copia identificada con su mes, el reintento limitado a un minuto aunque se cambie de modo, el rechazo de una copia de más de siete días al reactivar la opción y la posibilidad de continuar con una estimación manual cuando no hay copia. No se registraron errores de consola.

La consulta real de IPC en el navegador devolvió **octubre de 2026, 2,2 % mensual**, al momento de esta verificación. La respuesta no incluyó `Last-Modified`, por lo que la fecha de actualización de la fuente se mostró como no disponible. Octubre es el mes de referencia histórico; la consulta no convierte ese dato en inflación de noviembre ni en un pronóstico futuro.

## Pendientes académicos

Para completar el coloquio quedan la revisión personal del informe y el ensayo de la presentación, especialmente la derivación y el análisis de precisión. La declaración de IA debe reflejar la asistencia recibida en las cuentas paso a paso, el código, la redacción y la presentación.

La exposición prevista es de unos 10 minutos más 5 minutos de preguntas. Los materiales deben entregarse al menos 72 horas antes según las condiciones de la cátedra. La herramienta sigue sin publicarse en un hosting.

## Fuentes

Fuentes del marco conceptual consultadas el 16 de noviembre de 2026; esa fecha no acredita la vigencia de tasas bancarias:

- Banco Central de la República Argentina. (s. f.). *Plazos fijos: claves para invertir tu dinero*. https://www.bcra.gob.ar/plazos-fijos-tipos-plazos-y-rentabilidad/
- Ecma International. (2025). *ECMAScript 2025 language specification*. Apartados `Math.expm1` y `Math.log1p`. https://tc39.es/ecma262/2025/multipage/numbers-and-dates.html#sec-math.expm1
- Instituto Nacional de Estadística y Censos. (s. f.). *Índice de precios al consumidor*. https://www.indec.gob.ar/indec/web/Nivel4-Tema-3-5-31
- *Propiedades de la Transformada Z*. (s. f.). [Tabla suministrada para el coloquio]. Archivo: `Propiedades de la Transformada Z.pdf`.
- Rivara, L., & Vercelli, S. (s. f.). *Transformada Z* [Apunte de Matemática Superior]. Universidad Tecnológica Nacional, Facultad Regional San Francisco. Archivo: `Apunte 5 - Transformada Z.pdf`.
- Siebert, W. M. (s. f.). *The unilateral Z-transform and its applications* (cap. 8). Material alojado por Massachusetts Institute of Technology. Sección 8.2, página impresa 239. https://introcontrol.mit.edu/_static/fall24/extras/siebert8.pdf
- *Tabla de Algunas Transformadas Z*. (s. f.). [Tabla suministrada para el coloquio]. Archivo: `Tabla de Algunas Transformadas Z.pdf`.

La atribución del proveedor de tasas y sus condiciones figuran en la sección de datos bancarios. La declaración de uso de IA está en [docs/AI-USAGE.md](docs/AI-USAGE.md).
