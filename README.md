# Nuestro pequeño universo · Ale & Val

Aplicación privada de la pareja, con Next.js, React y TypeScript, preparada para Vercel.

Estado de esta revisión y pasos pendientes de publicación: [ESTADO-ENTREGA.md](ESTADO-ENTREGA.md).

## Conservar los datos

La aplicación usa exclusivamente Firebase **lezz-val-universo**. La galería original y sus archivos Cloudinary permanecen independientes. Las publicaciones posteriores de una web no se copian automáticamente a la otra.

No hay operaciones de eliminación de recuerdos ni archivos Cloudinary. Los nuevos archivos se firman en el servidor, usan identificadores únicos en nuestro-universo/ y overwrite=false. Editar detalles o portada no sustituye ni reordena medios. Se leen los formatos antiguos sin reescribirlos.

Cartas, canciones, planes, películas y reservas conservan su contenido al archivar o cancelar. Los cambios compartidos guardan la versión anterior exacta en una subcolección revisions, en la misma transacción. Un formulario de cartas/planes desactualizado se rechaza para evitar sobrescrituras silenciosas. Campos desconocidos de documentos anteriores se conservan.

Los borradores del navegador no se comparten automáticamente. Cine separa sus fuentes locales y remotas; un snapshot vacío no borra sus pendientes. Importar crea un respaldo del archivo original antes de mezclar. Los conflictos reciben otro identificador. Los ajustes antiguos que sólo existían en un navegador se conservan allí y se comparten al editar/confirmar desde ese dispositivo.

## Acceso y funciones

- Entrada con Google; sólo las tres identidades autorizadas y verificadas pueden leer o escribir. Una sesión JSON local no abre la aplicación. La sesión Firebase se restaura tras verificar token y lectura del servidor.
- Galería: publicaciones nuevas, detalles, portada, favoritos por cuenta, búsqueda, colecciones, historias, recordatorios y visor de fotos/videos.
- Cartas: contenido, canción, color y fecha compartidos; edición con historial, archivo y restauración. La apertura programada es una sorpresa visual, no cifrado ni secreto frente a otra cuenta autorizada.
- Música: enlaces Spotify reales con su embed y muestras del catálogo Apple. No se convierten identificadores iTunes en Spotify. Conectar cuentas/importar bibliotecas mediante OAuth requiere una aplicación propia de Spotify y no se presenta como ya conectado.
- Planes: edición y estado compartidos, sin overrides locales que oculten actualizaciones remotas.
- Cine: fechas de México dinámicas, reservas con fecha exacta, confirmaciones de guardado, archivo/restauración e historial de cancelación. Un boleto exportado usa su reserva, no la pestaña visible.
- Juegos: partidas por foto/nivel/tamaño, objetivos aplicados, reintentos que permiten mejorar récords. Los récords se sincronizan por UID; las partidas en curso siguen en el dispositivo. El historial local propio se comparte expresamente, sin publicar automáticamente resultados de la pareja.
- ZIP de galería: descargas por partes con fotos/videos, JSON original de Firestore, vista y manifiesto SHA256. Informa CORS, interrupciones y archivos mayores de 110 MB sin afirmar respaldo completo. Deben permitirse varias descargas. No restaura ni modifica Firebase.
- Respaldo JSON de cine incluye reservas y fuentes originales. El diálogo de galería también exporta borradores/partidas del dispositivo.
- PWA: caché versionado con el build actual de Next y pantalla sin conexión. No almacena documentos Firebase, API, fotos remotas ni audio mediante el service worker. Necesita conexión para verificar el acceso inicial.
- Regalo de Valeria enlazado a su dirección original.

Los recordatorios actuales son dentro de la web; las notificaciones push requieren su integración y configuración propias. No se reutilizan suscripciones del proyecto anterior.

## Desarrollo y publicación

Requiere Node >=22.13.0.

~~~sh
npm ci
npm run dev
npm test
npm run build
npm start
~~~

Desarrollo: puerto 5173. Producción local: Next en el puerto 3000. En Vercel seleccionar el framework Next.js y usar npm run build. El service worker se genera con .next/static y public después de compilar; no usa dist de Vinext.

Este proyecto se publica automáticamente en Vercel al subir cambios a la rama de GitHub conectada. No es necesario iniciar sesión con la CLI de Vercel para ese flujo. Las reglas de Firestore se despliegan por separado y deben coordinarse con la nueva versión de la web.

Configurar en el servidor Vercel las cuatro variables de .env.example. Los valores secretos nunca llevan NEXT_PUBLIC_, no se incluyen en el repositorio ni se envían al navegador. El Firebase Web SDK tiene configuración pública; la protección está en Auth y reglas.

Autorizar los dominios finales en Firebase Authentication. El proyecto preparado es lezz-val-universo, no galeria-lezz-y-val.

Desplegar únicamente las reglas del proyecto nuevo, después de comprobar la versión de la web:

~~~sh
npx firebase-tools deploy --only firestore:rules --project lezz-val-universo
~~~

Ese comando no migra documentos ni elimina índices. No ejecutar restauraciones ni limpiezas sobre el proyecto original. Los respaldos privados están fuera de esta carpeta.

## Verificación

Las pruebas locales cubren normalización, conservación de medios y borradores, fechas, identidad, firmas/token, límites HTTP, datos compartidos y progresión. Las reglas se verifican adicionalmente en un emulador demo, con autorización, historial exacto, denegación de borrados y compatibilidad de los trece formatos de películas existentes. Las pruebas no añaden contenido ficticio a producción.

I've set up prototype Security Rules to keep the data in Firestore safe. They are designed to be secure for the fixed verified Google identities, immutable media and creation fields, append-only history, bounded new data and denied deletions. However, you should review and verify them before broadly sharing your app. If you'd like, I can help you harden these rules.
