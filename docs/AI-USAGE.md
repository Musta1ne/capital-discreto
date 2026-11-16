# Uso de IA en la preparación del coloquio

Este registro describe la asistencia de ChatGPT y Codex en la definición y el desarrollo de la primera fase de una aplicación educativa sobre ahorro periódico y Transformada Z. Corresponde a la sesión de trabajo del 16 de noviembre de 2026.

## Herramientas y finalidad

El estudiante indicó que el prompt inicial de desarrollo había sido generado con ChatGPT. Codex asistió en la lectura de las condiciones y de la plantilla del trabajo, en las preguntas para precisar el alcance, en la revisión del modelo, en la preparación del código y sus pruebas y en la redacción de esta documentación.

La asistencia incluyó revisar fuentes primarias sobre Transformada Z, plazos fijos y funciones matemáticas del lenguaje. Esto no constituye una verificación de una oferta bancaria ni una aprobación académica otorgada por la herramienta.

## Extractos de los prompts

Los siguientes bloques son **extractos literales** de las instrucciones del usuario, no una transcripción completa de la conversación.

Sobre el tema y el propósito:

> **Tema:** Modelado del crecimiento de un ahorro mediante la Transformada Z, aplicado a depósitos mensuales en un plazo fijo argentino.

> Crear una web que combine:
> 1. Una presentación académica interactiva para exponer durante aproximadamente 10 minutos.
> 2. Un simulador de ahorro con interés compuesto.
> 3. Una explicación matemática de cómo se utiliza la Transformada Z para resolver el problema.

Sobre el cálculo y su comprobación:

> Implementar dos métodos independientes:
> - Cálculo iterativo mediante la ecuación en diferencias.
> - Cálculo directo mediante la fórmula obtenida con Transformada Z.
>
> Comparar ambos resultados y mostrar su diferencia numérica, con tolerancia para errores de punto flotante.
>
> Separar la lógica matemática de los componentes visuales y agregar pruebas automatizadas para los cálculos.

Sobre la integridad de los resultados:

> Por ahora, desarrollar la estructura y el contenido esencial. No inventar datos académicos ni resultados de verificaciones todavía no realizadas.

Sobre el alcance de la fase:

> No generar aún el informe Word/PDF.
>
> No implementar todavía escenarios de inflación o tasas variables.
>
> Priorizar código simple, mantenible y cálculos matemáticamente correctos.

Sobre la revisión previa de la idea:

> este es un prompt generado con chatgpt, si hay herramientas que te parecen innecesarias o cosas que no entendes preguntame

El requerimiento completo también especificaba React, TypeScript, Vite, Tailwind CSS, Recharts, KaTeX, diseño responsive e interfaz en español. **Esta oración es un resumen del requerimiento, no una cita literal.**

## Decisiones del estudiante

Después de las preguntas de alcance, el usuario respondió literalmente:

| Pregunta | Respuesta del usuario |
| --- | --- |
| Encaje de Transformada Z en la materia | “Sí, vimos Z o el tema está aprobado” |
| Momento del aporte | “Conservar aportes al final y saldo inicial cero” |
| Aporte personal que se desea investigar | “Precisión y errores de punto flotante” |

La primera respuesta deja constancia de lo informado por el estudiante. No se dispone en esta aplicación de una confirmación independiente de la docente.

## Qué aporta la herramienta y qué debe defender el estudiante

La IA propuso y ayudó a desarrollar una estructura para explicar la recurrencia, su resolución mediante Transformada Z y el contraste entre tres evaluaciones: iterativa, directa usual y directa con `expm1` y `log1p`. La revisión detectó la importancia del aporte al cierre, de distinguir períodos de 30 días de meses calendario y de separar diferencias de redondeo de errores de discretización.

El aporte personal elegido consiste en investigar la precisión numérica, interpretar las diferencias observadas y explicar por qué la evaluación usual puede perder precisión cuando la tasa es cercana a cero. El estudiante debe ejecutar y examinar los casos, comprender la derivación y sus supuestos y redactar sus propias conclusiones antes de presentar ese análisis como trabajo propio. La existencia de una web o de pruebas automáticas, por sí sola, no completa ese aporte.

Las pruebas del programa deben contrastarse con casos manuales conocidos y criterios explícitos. La concordancia entre dos evaluaciones no demuestra por sí sola que el modelo represente fielmente una oferta bancaria ni constituye una comparación contra un resultado exacto en todos los casos.

## Límites de esta declaración

Esta fase prepara una aplicación y documentación del proyecto. No acredita una ejecución de Python, una cotización bancaria oficial ni la elaboración del informe Word/PDF. Los resultados de compilación, pruebas y revisión visual deben declararse a partir de las ejecuciones efectivamente realizadas y de su evidencia.

La TNA inicial del 30 % y la TNA del 36,5 % del caso manual son ilustrativas. La fecha de esta sesión no debe presentarse como fecha de verificación de esas tasas en un banco.

Antes de la entrega académica, el estudiante debe revisar este registro para que refleje con precisión el uso efectivo de las herramientas y adjuntar los prompts completos si la cátedra los solicita.

## Cambio posterior de alcance

Después de las decisiones anteriores, el usuario cambió el propósito de la web. El siguiente bloque transcribe literalmente ese nuevo pedido:

> antes de ponerte a trabajar, quiero modificar algo. no quiero que hagas la web a forma de presentación. la web tiene que ser una herramienta funcional a traves del tiempo que se actualice con datos reales. la presentacion la voy a hacer aparte

Este pedido reemplaza el alcance inicial de una web organizada como presentación. Los extractos anteriores se conservan como registro de lo solicitado al comienzo, no como requisitos vigentes de navegación o diapositivas.

La definición de la integración de datos sigue abierta: falta decidir si las tasas corresponderán a varios bancos, a una sola entidad o a una referencia del BCRA, y si se realizará una proyección con tasa constante, un registro de renovaciones con sus tasas efectivas o ambas cosas. Estas opciones son preguntas pendientes, no decisiones del estudiante ni funciones implementadas.

Al registrar el cambio, el repositorio contiene la estructura inicial y la lógica matemática a tasa constante con archivos de pruebas. La aplicación web completa aún no está integrada y las pruebas todavía no se han verificado mediante ejecución en este estado del proyecto.

## Alcance acordado para la herramienta continua

Tras resolver las preguntas sobre los datos, se acordó comparar tasas de varios bancos y proyectar manteniendo constante la tasa elegida. La fuente seleccionada es ArgentinaDatos, un proveedor independiente, mediante el endpoint `https://api.argentinadatos.com/v1/finanzas/tasas/plazoFijo`. Este párrafo es un resumen de las decisiones de alcance, no una cita literal del usuario.

La herramienta tendrá vistas normales de simulación, tasas bancarias, modelo matemático y precisión. La consulta externa se realizará desde el navegador, con una copia local y actualización según el tiempo transcurrido. Se conserva la opción manual; no se implementa un registro de renovaciones con tasas variables. La aplicación permanece local en esta fase.

La API no publica la fecha de vigencia de las tasas. Se identificará la fecha de consulta sin presentarla como fecha de actualización bancaria, y se atribuirán los datos a ArgentinaDatos. El valor cero del campo de no clientes se interpretará como ausencia de dato. Las condiciones de consulta están documentadas en el README.

Las definiciones pendientes mencionadas en el apartado anterior corresponden a la etapa de entrevista; quedan resueltas por este acuerdo. La ejecución de las pruebas y la revisión de la herramienta se deben informar a partir de sus resultados efectivos al completar la implementación.

## Cierre de la primera implementación

El 16 de noviembre de 2026 quedaron implementadas las cuatro vistas de la herramienta. Se ejecutaron 180 pruebas Vitest (97 de ahorro y 83 de tasas), todas aprobadas, y la compilación de producción con comprobación de tipos. La consulta real en navegador devolvió 33 entidades. También se verificaron once recorridos y estados de interfaz, incluidas fallas simuladas del proveedor y vencimiento de la copia local.

Estos resultados corresponden a JavaScript/TypeScript y a la aplicación. No constituyen una ejecución de Python ni certifican la vigencia de las tasas. El informe y la presentación académica quedan fuera de esta fase.

## Fase adicional de ajuste por inflación

Posteriormente se autorizó incorporar un ajuste opcional por inflación. Este apartado **resume** el pedido y las decisiones de la nueva fase; no es una transcripción literal del prompt. La restricción inicial de no implementar inflación queda superada para este ajuste. Se mantiene la proyección con TNA constante, sin registro de renovaciones ni interfaz de tasas variables.

La opción comienza desactivada y conserva los resultados nominales existentes. Al activarla se usa el último IPC mensual publicado disponible en ArgentinaDatos, identificado con su mes de referencia, o una estimación mensual manual. La interfaz repite la inflación seleccionada como supuesto constante: un dato histórico no se presenta como pronóstico ni como inflación del mes actual.

La asistencia de IA incluye la conversión del porcentaje mensual a una fracción de 30 días con un mes promedio de 365/12 días, el deflactor acumulado y la distinción entre saldo real, aportes reales y ganancia real. Cada aporte se convierte con el deflactor del cierre en que se realiza; no se descuenta la suma nominal de aportes con el deflactor final.

Los importes reales se expresan en pesos de la fecha base capturada al abrir la proyección. La capa matemática admite secuencias de inflación por período para sus comprobaciones, mientras que la interfaz de esta fase utiliza un supuesto constante.

La serie se obtiene de `https://api.argentinadatos.com/v1/finanzas/indices/inflacion`. Los valores representan porcentajes mensuales y las fechas identifican meses de referencia, no fechas de publicación. Las fechas de consulta y de actualización disponible se distinguen. El IPC tiene una copia local independiente de la de tasas bancarias, con consulta de referencia cada 3 horas y uso de copia por un máximo de 7 días.

Al iniciar la fase se dejó pendiente su verificación mediante ejecuciones efectivas. Las 180 pruebas y los recorridos de navegador registrados en el cierre anterior corresponden a la primera fase y no demuestran por sí solos la corrección de este ajuste adicional.

## Verificación de la fase de inflación

El 16 de noviembre de 2026 se completó la integración del ajuste opcional. La ejecución conjunta de Vitest aprobó **313 pruebas**: 97 de ahorro, 83 de tasas, 57 del motor de inflación y 76 de adaptación de datos del IPC. La comprobación de tipos y la compilación de producción terminaron correctamente; Vite conserva una advertencia sobre el tamaño del paquete JavaScript.

La consulta real desde el navegador obtuvo un IPC mensual de **2,2 % correspondiente a octubre de 2026**. La fuente no informó `Last-Modified` y la interfaz indicó que la fecha de actualización no estaba disponible. El mes de referencia se presentó por separado de la fecha de consulta, sin atribuir el valor al mes actual ni usarlo como pronóstico.

Doce comprobaciones de interfaz revisaron la conservación de los resultados nominales con la opción desactivada, inflación manual cero, pérdida real bajo un supuesto mensual del 10 % y ganancia real cero para un único aporte al cierre del primer período. También cubrieron deflación, entrada manual inválida sin alterar el cálculo nominal, tabla ampliada y vista móvil sin desbordamiento horizontal ni errores de KaTeX observados. Se simularon fallas del proveedor con y sin copia, se comprobó que cambiar de modo no evita el límite de reintento y se rechazó una copia vencida al reactivar la opción tras una pausa larga. La consola no registró errores.

Estos resultados acreditan las ejecuciones indicadas en JavaScript/TypeScript y en la interfaz. El análisis del aporte personal, sus conclusiones y la defensa de los supuestos siguen a cargo del estudiante; no se acredita una ejecución de Python ni la preparación del informe académico.

## Claridad del resultado en poder adquisitivo

El usuario señaló que un importe negativo compara poder adquisitivo frente a los aportes ajustados, y no una pérdida bancaria nominal. Mediante la entrevista eligió la etiqueta «Resultado en poder adquisitivo» con aclaración visible. Se unificó ese término en tarjeta, tabla y glosario, identificando la fecha base y conservando la fórmula y los importes calculados.

La revisión también alineó el color con el signo del importe mostrado en el límite de medio centavo. Esta modificación es de comunicación y presentación; no introduce una nueva métrica ni valida un importe particular sin conocer sus parámetros.

## Alineación con los materiales de la cátedra

El usuario proporcionó tres PDF para adaptar la explicación a la terminología estudiada: `Apunte 5 - Transformada Z.pdf`, `Propiedades de la Transformada Z.pdf` y `Tabla de Algunas Transformadas Z.pdf`. Este apartado resume el nuevo alcance y no transcribe literalmente el pedido.

La asistencia de IA incluye comparar la notación y el procedimiento de la herramienta con esos materiales, identificar páginas y filas concretas y revisar que la explicación use señal en tiempo discreto o sucesión, escalón unitario, linealidad, desplazamiento temporal, anti-transformada Z y descomposición en fracciones parciales. La notación visible se unifica como y(n), Y(z) y Z[y(n)]; los identificadores internos del código permanecen en inglés.

La descomposición se explica siguiendo el orden del apunte: dividir Y(z) por z, descomponer en fracciones parciales, multiplicar por z y reconocer los pares. Se incorpora el escalón u(n) al reescribir la recurrencia y(n+1) = ay(n) + Pu(n), con y(0) = 0, para conservar el primer aporte en y(1) = P. El valor inicial sirve como comprobación; no se atribuye al saldo con aportes positivos y tasa no negativa un valor final finito.

La portada del apunte corresponde a Matemática Superior de la UTN, Facultad Regional San Francisco, e identifica a Laura Rivara como docente y a Sofía Vercelli como ayudante. Esa atribución no cambia la materia del coloquio, Análisis Numérico. No se usa una fecha de los metadatos como fecha de publicación; los materiales se citan sin fecha visible y las tablas no reciben un autor no impreso.

La tabla de propiedades numera sus filas pero no imprime sus nombres; las denominaciones de la explicación provienen del apunte. La tabla de pares no numera las entradas, por lo que no se inventan números de fórmula para escalón, rampa o exponencial. El material del MIT se conserva como complemento, mientras que los tres PDF orientan el vocabulario y el procedimiento del curso.

La correspondencia queda documentada en [COURSE-ALIGNMENT.md](COURSE-ALIGNMENT.md), sin copiar los PDF a los archivos públicos ni mostrar rutas personales. Esta fase modifica contenido y notación, sin cambiar las fórmulas de los motores de cálculo. Se completó la compilación, se renderizaron 38 expresiones estáticas de KaTeX sin errores, se comprobaron seis evaluaciones de las fracciones parciales y se revisaron los seis pasos y su lectura móvil en el navegador. No se atribuye una nueva ejecución a las pruebas anteriores de los motores, que no se modificaron.
