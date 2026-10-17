# Nuestro pequeño universo · Ale & Val

Primera versión independiente: React, TypeScript y Vite. Diseño floral adaptable a móvil, galería, línea del tiempo, cartas, canciones con dedicatorias, planes, rompecabezas y diamantitos.

## Conservación de recuerdos

- Los proyectos originales no se han modificado. Esta carpeta es independiente.
- El adaptador Firebase sólo puede autenticar y leer `memories`. No importa operaciones de escritura, modificación, subida ni borrado.
- No incluye credenciales administrativas, firmas Cloudinary ni scripts de restauración.
- Los formatos antiguos `url` y actuales `media[]` se normalizan en memoria, conservando documentos incluso sin foto.
- Abrir un JSON consulta su contenido en el navegador. Nunca lo restaura ni lo envía a Firebase.
- El service worker guarda la interfaz y fotografías públicas de ejemplo. No almacena documentos Firebase, fotos remotas ni respaldos importados.

## Lo disponible

- Inicio floral y contador por fechas de calendario en America/Mexico_City.
- Recuerdos por búsqueda, colección, tipo y favoritos locales; visor de múltiples fotos/videos.
- Línea del tiempo automática por fecha del recuerdo, incluyendo registros sin fecha.
- Cartas y sobres con editor, lectura, filtros y exportación JSON.
- Canciones dedicadas con enlaces Spotify validados. No reproduce ni sincroniza audio Spotify con juegos.
- Planes y sueños con categorías, fechas y estado vivido/pendiente.
- Rompecabezas 3×3/4×4: intercambio por toque o teclado, pistas, deshacer y progreso.
- Diamantitos Canvas: 24×32, paleta de hasta 20 colores, zoom, pintar, deshacer y progreso.
- Regalo de Valeria enlazado a su dirección original.
- Manifiesto, iconos y caché estática para PWA. No pide permisos de notificaciones.

## Límites de esta primera versión

Cartas, canciones, planes, favoritos y partidas se guardan **sólo en el navegador/dispositivo**. No se comparten todavía entre ustedes ni entre dispositivos. Cada cuenta y cada respaldo tienen un espacio separado; exportar JSON conserva una copia de cartas, canciones y planes. No limpiar los datos del navegador sin exportar lo que se quiera conservar.

La vista inicial utiliza contenido de ejemplo, identificado en pantalla. Las imágenes de ejemplo son públicas de Unsplash; referencias en `public/images/credits.json`. No son sus fotografías personales.

La conexión Google consulta el proyecto Firebase existente. Para utilizarla desde un dominio nuevo, ese hostname debe figurar en **Firebase Console → Authentication → Settings → Authorized domains**, y la cuenta debe estar autorizada por sus reglas actuales. La web ofrece errores claros si falta esa configuración. No se cambiaron los dominios ni las reglas durante este desarrollo. No se realizó acceso autenticado a sus fotos durante las pruebas.

Al abrir un respaldo, las URLs remotas sólo funcionan si el archivo sigue disponible y sus permisos permiten acceso. CORS puede impedir convertir ciertas imágenes remotas en diamantitos; el juego permite elegir una foto del dispositivo, procesada localmente y sin subirla.

## Ejecutar y verificar

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

`npm run build` comprueba TypeScript y genera `dist/`, incluido el service worker con revisión de caché basada en los archivos construidos. El adaptador Firebase se descarga en un chunk aparte cuando se solicita la conexión.

El override exacto `@grpc/grpc-js: 1.13.6` resuelve los avisos de la dependencia Node transitiva de Firebase. El bundle de navegador de Firestore no utiliza servidor gRPC. Lock instalado, compilación y pruebas se verificaron; auditoría npm: cero vulnerabilidades conocidas en el momento del desarrollo.

Las pruebas cubren normalización sin mutación de entrada, medios antiguos/múltiples, fechas inválidas, URLs peligrosas, puzzle y cuantización, separación de respaldos y límites de lectura/caché. La revisión visual se hizo con navegador de escritorio y viewport de 390 px. El acceso privado real de Firebase y la instalación PWA en sus teléfonos requieren verificación posterior con ustedes.

## Publicación independiente

`.openai/hosting.json` identifica la vista privada creada con Sites. No apunta al repositorio GitHub original ni modifica su despliegue Vercel. Para desplegar en Vercel desde otra carpeta/repositorio, usar build `npm run build`, salida `dist` y conservar la configuración Firebase existente. No incluir claves de servicio ni respaldos privados en el repositorio.
