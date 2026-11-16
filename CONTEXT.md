# Ahorro periódico con Transformada Z

Vocabulario del modelo de ahorro con aportes al cierre y reinversión del saldo en períodos de 30 días.

## Lenguaje

**Período**:
Intervalo de 30 días entre dos cierres consecutivos del modelo; doce períodos representan 360 días.
_Evitar_: Mes calendario, año de doce períodos.

**Aporte al cierre**:
Cantidad constante P incorporada al saldo al finalizar cada período, después de calcular los intereses sobre el saldo anterior.
_Evitar_: Aporte anticipado, depósito inicial.

**Saldo inicial**:
Saldo anterior al primer período, definido como y(0) = 0; no contiene un aporte en el día inicial.
_Evitar_: Primera cuota, capital ya invertido.

**Saldo acumulado**:
Cantidad y(n) disponible inmediatamente después del aporte del período n, que reúne los aportes realizados y los intereses acumulados.
_Evitar_: Ganancia, intereses totales.

**Total aportado**:
Suma de los aportes realizados hasta el período n, igual a Pn y ajena a los intereses obtenidos.
_Evitar_: Saldo acumulado, rentabilidad.

**Intereses acumulados**:
Diferencia entre el saldo acumulado y el total aportado hasta un mismo cierre.
_Evitar_: Ahorro total, ganancia real.

**Tasa nominal anual**:
Tasa anual expresada como porcentaje, denominada TNA, de la que se obtiene la tasa por período mediante la proporción 30/365.
_Evitar_: Tasa efectiva anual, tasa mensual.

**Tasa por período**:
Fracción i aplicada al saldo anterior durante una colocación de 30 días, igual a (TNA/100)(30/365).
_Evitar_: TNA, porcentaje anual.

**Reinversión**:
Inclusión del capital y de los intereses obtenidos en el saldo que genera intereses en el período siguiente.
_Evitar_: Retiro de intereses, interés simple.

**Recurrencia del ahorro**:
Relación y(n) = (1+i)y(n−1) + P entre dos cierres consecutivos, con y(0) = 0 y aportes al cierre.
_Evitar_: Aproximación de una ecuación diferencial.

**Solución mediante Transformada Z**:
Expresión analítica del saldo de la recurrencia, y(n) = P((1+i)^n−1)/i para i distinto de cero y y(n) = Pn para i = 0.
_Evitar_: Predicción bancaria, método de discretización.

**Señal en tiempo discreto**:
Sucesión de valores asociados a índices enteros; en el modelo, y(n) representa el saldo en cada cierre.
_Evitar_: Saldo continuo entre vencimientos.

**Transformada Z**:
Serie Z[x(n)] = Σ x(n)z^(−n), desde n = 0 hasta infinito, que asocia una sucesión con una función X(z) donde converge.
_Evitar_: Saldo proyectado, función continua del tiempo.

**Escalón unitario**:
Sucesión u(n) que vale uno para n ≥ 0 y cero para n < 0; la tabla suministrada también la representa como U[n].
_Evitar_: Aporte efectuado en el día inicial.

**Rampa unitaria**:
Sucesión que vale n para n ≥ 0 y cero para n < 0, cuyo par de Transformada Z es z/(z−1)^2.
_Evitar_: Crecimiento compuesto exponencial.

**Linealidad de la Transformada Z**:
Propiedad que transforma una combinación lineal de sucesiones en la misma combinación de sus transformadas.
_Evitar_: Interés simple.

**Desplazamiento temporal**:
Propiedad que vincula una sucesión desplazada con su transformada; para un adelanto, Z[x(n+1)] = z[X(z)−x(0)].
_Evitar_: Desplazamiento sin condición inicial.

**Anti-transformada Z**:
Operación que recupera una sucesión a partir de su transformada bajo las condiciones de convergencia pertinentes; también denominada transformada Z inversa.
_Evitar_: Fórmula de saldo sin identificar la sucesión.

**Descomposición en fracciones parciales**:
Método de obtención de la anti-transformada Z mediante la separación de una función racional en términos cuyos pares pueden reconocerse en una tabla.
_Evitar_: Aproximación numérica de la inversa.

**Diferencia numérica entre evaluaciones**:
Distancia entre los saldos calculados por dos evaluaciones de la misma solución matemática, afectadas por el redondeo de punto flotante.
_Evitar_: Error de discretización, prueba de fidelidad bancaria, error exacto.

**Tasa ilustrativa**:
Valor de TNA elegido para explorar el modelo, sin atribución a una oferta bancaria vigente.
_Evitar_: Tasa bancaria verificada, tasa actual.

**Proyección del ahorro**:
Estimación de saldos futuros obtenida a partir de aportes y tasas supuestos, que pueden tomar como referencia datos observados en una fecha.
_Evitar_: Historial efectivo, registro de renovaciones.

**Registro de renovaciones**:
Historial de colocaciones efectivamente realizadas y de las condiciones aplicadas a cada vencimiento.
_Evitar_: Proyección del ahorro, garantía de tasa futura.

**Tasa bancaria informada**:
TNA atribuida a una entidad y una condición de cliente por una fuente de datos, cuya aplicabilidad depende de las condiciones de la oferta.
_Evitar_: Tasa garantizada, tasa futura.

**Fecha de consulta**:
Momento en que se obtuvo un dato desde la fuente externa; no identifica cuándo se publicó ni desde cuándo se aplica.
_Evitar_: Fecha de vigencia, fecha de actualización bancaria.

## Poder adquisitivo

**IPC mensual publicado**:
Variación porcentual del índice de precios al consumidor entre dos meses consecutivos para un mes de referencia ya informado.
_Evitar_: Inflación interanual, pronóstico, inflación del mes actual.

**Mes de referencia del IPC**:
Mes al que corresponde una variación de precios publicada, distinto del momento en que se publicó o consultó el dato.
_Evitar_: Fecha de publicación, fecha de consulta.

**Escenario de inflación constante**:
Supuesto que repite una misma tasa de inflación durante los períodos futuros de una proyección, aunque se tome como referencia un dato histórico.
_Evitar_: Pronóstico oficial, inflación futura observada.

**Inflación por período**:
Fracción de variación de precios durante 30 días, obtenida de la variación mensual mediante la convención de un mes promedio de 365/12 días.
_Evitar_: Porcentaje mensual sin convertir, TNA.

**Fecha base del poder adquisitivo**:
Fecha inicial de la proyección a cuyos pesos se convierten los saldos y aportes para compararlos en una misma unidad de poder adquisitivo.
_Evitar_: Mes de referencia del IPC, fecha de consulta de la fuente.

**Deflactor acumulado**:
Producto de los factores de variación de precios desde la fecha base hasta un cierre, con valor inicial uno.
_Evitar_: Suma de porcentajes, tasa de interés acumulada.

**Saldo real**:
Saldo nominal de un cierre dividido por su deflactor acumulado, expresado en pesos de la fecha base.
_Evitar_: Saldo bancario efectivo, saldo nominal, registro de renovaciones.

**Aportes reales acumulados**:
Suma de los aportes nominales convertidos individualmente a pesos de la fecha base con el deflactor de cada cierre de aporte.
_Evitar_: Total nominal aportado, total nominal descontado al cierre final.

**Resultado en poder adquisitivo**:
Diferencia entre el saldo real y los aportes reales acumulados hasta el mismo cierre, expresada en pesos de la fecha base. Un resultado negativo indica menor poder adquisitivo frente a esos aportes bajo el escenario supuesto.
_Evitar_: Ganancia o pérdida real sin base de comparación, intereses nominales, pérdida bancaria nominal, débito bancario, saldo real menos aportes nominales.
