# Limitaciones conocidas del MVP

Lo que el MVP **no** hace a propósito (o hace de forma provisional). Cada punto apunta a la fase que lo resolvería.

## Datos y seguridad
- **Todos los datos son sintéticos** y viven solo en el navegador (IndexedDB). No hay servidor, copia de seguridad ni sincronización entre dispositivos (Fases 15–16).
- **El acceso es simulado**: se elige un rol sin contraseña. La restricción por unidad de las supervisoras es solo de interfaz; la seguridad real llega con la autenticación y la seguridad por filas (Fase 17).
- Sin integración con sistemas del hospital (HL7/FHIR, ADT); el modelo de eventos ya refleja los mensajes ADT para facilitarlo (Fase 18+).

## Simulación
- La simulación corre en el navegador (una pestaña «líder» mediante Web Locks) y se detiene si se cierran todas las pestañas.
- El reloj simulado (`simNow`) se guarda sin evento (excepción documentada en `specs/domain.md`); una orden manual que coincida con un tick puede retrasarlo un tick, y el simulador lo corrige saltando minutos ya jugados.
- El avance rápido y 1800× dependen de la potencia del equipo; en un portátil, un día completo tarda del orden de un minuto.

## Indicadores y alertas
- Los umbrales editables en *Ajustes* (nivel del hospital, reglas de alerta, rotación de pantalla) se guardan **en el navegador**, no en la base de datos. Los indicadores de cada panel conservan sus umbrales por defecto.
- Las ventanas de eventos son de 5000 (rotación de camas, ingresos, seguimiento): suficientes para un día simulado, no para semanas.
- El nivel del hospital de la barra superior recalcula censo y urgencias al cambiar los datos (memoizado por minuto simulado); con más de ~600 camas habría que moverlo a un selector compartido o a un servidor.
- Las alertas y los umbrales no distinguen turnos ni unidades.

## Interfaz
- Solo español. Sin impresión/exportación de informes.
- *Modo pantalla* usa `zoom` del navegador para agrandar el texto; en navegadores sin `zoom` se ve a tamaño normal.
- El seguimiento de pacientes es de solo lectura; el recorrido se reconstruye a partir de las marcas de tiempo de las entidades.
- Verificado con Chrome/Edge (automatizado) y Safari iPad (a mano, ver `docs/install-and-offline.md`).
