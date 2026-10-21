# Guion de demostración — Torre de Control

**Duración:** 7–8 minutos · **Perfil:** Jefe/a de Admisión (puede hacerlo todo) · **Datos:** ficticios.
Este guion lo sigue el test `e2e/demo-script.spec.ts`: cada paso numerado es un `test.step`. Si cambia la aplicación, cambian los dos.

## 0. Preparación (antes de empezar)
1. Abra la aplicación e **inicie sesión como Jefe/a de Admisión**.
2. En **Ajustes → Datos de demostración** elija el escenario **«Lunes de alta presión»** (o «Pico de gripe» para la versión dramática) y pulse **Restablecer demo**. Si cambia la semilla, la demo vuelve al login: entre de nuevo como Jefe/a de Admisión.
3. En **Ajustes → Avance rápido** pulse **14:00**. La simulación queda en pausa a las 14:00 con medio día de actividad ya ocurrida.

> «Todo lo que va a ver es simulado y ficticio: ni un paciente real. El hospital tiene unas 600 camas y se comporta como un lunes de mucha presión.»

## 1. La torre de control (1 min) — *Torre de control*
- Señale el **nivel del hospital** (Normal / Alerta / Crítico) y *por qué* lo es: ocupación, pacientes pendientes de ingreso, espera máxima.
- Recorra las dos filas de indicadores: ocupación, camas libres, ingresos/altas, balance de camas, Urgencias, traslados, alertas.
- Muestre los gráficos de las últimas 24 horas.

> «En una pantalla, el estado de todo el hospital. Cada indicador lleva a su panel.»

## 2. Alertas (1 min) — la campana
- Abra el **centro de alertas**: las más graves primero; filtre por **Urgencias**.
- **Reconozca** una alerta: queda registrado quién y cuándo, y el contador baja.

> «Las alertas se generan solas con las reglas del plan de contingencia; nadie las escribe a mano.»

## 3. Urgencias → seguimiento de un paciente (1,5 min)
- En **Urgencias**: el tablero por fases con el nivel de triaje (color **y** número) y la lista de pacientes pendientes de ingreso.
- Pulse el icono de recorrido de un paciente: se abre su **seguimiento**: dónde está, qué ha pasado y cuánto tardó cada paso, y cuál es el siguiente paso.

> «Como el seguimiento de un paquete, pero de un paciente.»

## 4. Camas (1,5 min)
- En **Camas**: el censo por unidad; abra una unidad y su mapa de camas.
- En la lista de solicitudes de cama, **Asignar cama** a la más urgente: la aplicación sugiere camas (mismo servicio primero, aislamiento solo si hace falta). Al reservar se crea el traslado automáticamente.

## 5. Traslados (1 min)
- En **Traslados**: la cola por prioridad y SLA, los celadores libres y ocupados, **Asignar celador**.
- Cambie a **Celador/a** para enseñar «Mi cola»: aceptar, recoger, entregar.

## 6. Modo pantalla (1 min)
- Pulse el icono **Modo pantalla**: pantalla completa y oscura que rota sola entre los paneles. Flechas para moverse, espacio para pausar, **Esc** para salir.

> «Esto es lo que verían en la pantalla de la oficina de Admisión.»

## 7. Cierre — avanzar el día (30 s)
- En **Ajustes → Avance rápido** pulse **20:00** y vuelva a la torre de control: el hospital ha evolucionado y las alertas con él. O ponga la velocidad a **1800×** en la barra superior para ver correr el día (en un portátil, unos minutos).

## Si algo no sale
- **No hay alertas / todo en verde:** elija «Pico de gripe» y avance a las 14:00.
- **La simulación no avanza:** compruebe que está en marcha (botón ▶) y la velocidad; el avance rápido siempre la deja en pausa.
- **Volver a empezar:** Ajustes → Restablecer demo (la misma semilla da siempre el mismo hospital).
