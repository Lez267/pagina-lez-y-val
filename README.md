# Nuestro pequeño universo · Ale & Val

Jardín floral con React, TypeScript y Vinext sobre Workers. La galería anterior y su despliegue Vercel siguen independientes.

## Datos y conservación

La nueva aplicación se conecta exclusivamente a **lezz-val-universo**. Se copiaron y verificaron 16 publicaciones, sus campos originales y 189 URLs distintas de Cloudinary; las tres identidades Google conservaron sus UID. Las dos suscripciones push antiguas quedaron en el respaldo y no se reutilizan. La copia corresponde a un momento concreto: las publicaciones posteriores de ambas webs no se replican entre proyectos.

Los proyectos originales no se editan desde esta carpeta. Las reglas nuevas niegan todas las eliminaciones y la aplicación no incluye operaciones para borrar publicaciones o archivos. La edición actual cambia detalles, portada, recordatorios y favoritos; conserva los medios y campos desconocidos del documento original.

Las nuevas fotos y videos usan un identificador aleatorio bajo `nuestro-universo/`, con `overwrite=false`. El preset de subida antiguo sigue aparte. La firma se prepara en el servidor después de verificar la firma RS256 del token Firebase, su proyecto, proveedor Google, correo verificado y UID autorizado. El secreto Cloudinary nunca se entrega al cliente. El API Key de Cloudinary forma parte del formulario firmado que exige su API; el API Secret permanece en el servidor.

Límites del formulario: 20 archivos, 20 MB por imagen, 100 MB por video y 250 MB por publicación. El servidor verifica el tamaño **declarado** y firma formatos permitidos; esa firma no certifica el número de bytes del archivo real. Se aplican también los límites de la cuenta Cloudinary.

Los respaldos privados de Firestore/Auth y las credenciales están fuera de esta carpeta y del repositorio. No ejecutar restauraciones ni utilidades de limpieza contra el proyecto original. El motor de copia conserva los valores Firestore originales; la normalización visual de esta web no sirve para restaurar datos.

## Funciones

- Galería con búsqueda, etiquetas, colecciones, favoritos compartidos, visor de fotos/videos y navegación entre archivos/publicaciones.
- Publicación de nuevos recuerdos mediante subidas firmadas; edición conservadora de sus detalles y portada.
- Historias de publicaciones recientes, recuerdos de este día, aniversarios y recordatorios en pantalla. Las historias dejan de mostrarse por fecha, sin borrar su publicación.
- Línea del tiempo basada en la fecha de los recuerdos.
- Cartas, canciones/dedicatorias y planes compartidos mediante Google, con actualizaciones entre dispositivos. Los borradores locales anteriores permanecen en su almacenamiento y se comparten únicamente al confirmarlo.
- Guardado local opcional y exportación JSON de cartas, canciones y planes. Los ejemplos y respaldos abiertos conservan su espacio local separado.
- Enlaces validados a canciones, playlists y álbumes Spotify. No hay conexión OAuth con la cuenta Spotify, reproducción sincronizada ni importación de su biblioteca.
- Rompecabezas 3×3/4×4 y diamantitos Canvas con progreso local.
- Regalo de Valeria enlazado a su dirección original.
- PWA con manifiesto, iconos y caché de interfaz/imágenes de ejemplo; sin caché de documentos Firebase, fotos remotas ni API de firmas.

La interfaz inicial identifica sus imágenes de ejemplo. Al abrir Google se utiliza la galería independiente; abrir un JSON sólo consulta el archivo en ese navegador, sin enviarlo ni restaurarlo en Firebase.

## Alcance pendiente

Esta revisión no declara paridad completa con todas las funciones históricas: no incluye notificaciones push, exportación ZIP de todos los archivos ni añadir/sustituir medios dentro de una publicación existente. Los recordatorios actuales se consultan dentro de la web. Los enlaces Cloudinary conservan sus permisos de entrega originales; el acceso privado de la web no cambia por sí mismo la privacidad de esos enlaces.

No se crean publicaciones o archivos de prueba en producción. La primera subida real y la instalación PWA en sus teléfonos requieren comprobarse con ustedes.

## Desarrollo

Requiere Node 22.13 o posterior.

```sh
npm ci
npm run dev
npm test
npm run build
npm start
```

El desarrollo sirve el puerto 5173. `npm start` utiliza el Worker compilado de `dist/server/wrangler.json`. La publicación se prepara con los helpers Sites, conservando `.openai/hosting.json` y el ID del sitio existente; no es un despliegue estático Vite ni debe apuntar al repositorio original.

Variables de servidor: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` y `FIREBASE_ALLOWED_UIDS`. En Sites se guardan como secretos de ejecución. No usar prefijos públicos, no incluirlas en el manifiesto ni versionar archivos privados. La configuración web de Firebase es pública; las reglas y la autenticación controlan sus permisos.

Next 16.3.8 y el override Sharp 0.35.5 corrigen los avisos detectados en las dependencias del servidor. La auditoría de dependencias de producción dio cero avisos conocidos durante esta revisión; esto no sustituye las pruebas de autorización y conservación de datos.

Las pruebas cubren normalización, enlaces peligrosos, fechas, juegos, aislamiento de proyectos, preservación de medios, edición parcial, favoritos propios, firma de subidas, tokens adulterados, límites HTTP, idempotencia y conservación de borradores. Las reglas se prueban adicionalmente con Firestore Emulator fuera del sitio, incluyendo copias privadas en memoria de los 16 documentos originales.
