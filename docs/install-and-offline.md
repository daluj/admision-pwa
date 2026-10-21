# Instalación y uso sin conexión

Torre de Control es una PWA: se instala como una aplicación y, después de la primera visita, **funciona sin conexión** (la aplicación se guarda en el navegador y los datos están en IndexedDB). Esta guía sirve para verificarlo en cada dispositivo.

> Lo automatizable ya lo cubre `e2e/offline.spec.ts` (todas las rutas sin conexión, manifiesto e iconos). Los pasos marcados **A MANO** requieren un dispositivo real.

## Chrome / Edge de escritorio — A MANO
1. Abra la aplicación (`https://…` o `http://localhost:4173` tras `npm run build && npm run preview`) e inicie sesión.
2. Recorra *Camas* y *Urgencias* una vez.
3. En la barra de direcciones aparece el icono **Instalar**; pulse y confirme. Se abre una ventana propia sin barra del navegador.
4. Cierre la aplicación, **desconecte la red** (modo avión / DevTools → Network → Offline) y ábrala de nuevo desde el icono instalado.
   - Esperado: carga igual, con los datos y el reloj simulado donde estaban; todas las pantallas funcionan (la simulación sigue avanzando).
5. Publique una versión nueva: al reconectar aparece el aviso **«Actualizar»**; al pulsarlo la aplicación se recarga con la versión nueva.

## iPad / iPhone (Safari) — A MANO
1. Abra la aplicación en **Safari** e inicie sesión.
2. Botón *Compartir* → **Añadir a pantalla de inicio**. El icono es el de Torre de Control (180 px).
3. Ábrala desde la pantalla de inicio: se muestra a pantalla completa (sin barra de Safari).
4. Active el **modo avión** y vuelva a abrirla.
   - Esperado: carga y muestra los datos guardados.
   - Limitación conocida de iOS: el sistema puede borrar los datos de sitios web que no se usan durante semanas; en la demo basta *Restablecer demo*.
5. Gire el iPad: el diseño se adapta (vertical y horizontal). *Modo pantalla* (`/pantalla`) está pensado para horizontal.

## Comprobaciones rápidas (DevTools)
- *Application → Manifest*: sin avisos; iconos de 192, 512 y 512 *maskable*.
- *Application → Service Workers*: `activated and running`.
- *Lighthouse → PWA/Installable*: cumple.

## Si algo falla
- **No aparece «Instalar»:** hace falta HTTPS (o `localhost`) y haber cargado la aplicación una vez completa.
- **Sin conexión muestra la página del navegador:** el service worker aún no estaba activo; abra la aplicación con red, espere unos segundos y repita.
- **Datos antiguos tras actualizar:** *Ajustes → Restablecer demo*.
