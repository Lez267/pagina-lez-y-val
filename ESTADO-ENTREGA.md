# Estado de las correcciones

Actualizado el **19 de octubre de 2026**. Este documento describe el código local preparado; no afirma que esta revisión ya esté publicada.

## Publicación

- Destino: https://pagina-lez-y-val-ipf4.vercel.app
- Repositorio: https://github.com/Lez267/pagina-lez-y-val
- Vercel ya publica automáticamente desde la rama de GitHub conectada. No se necesita iniciar sesión con la CLI de Vercel para usar ese flujo.
- Las correcciones de esta revisión todavía están en el código local; no se han subido a GitHub desde este trabajo.
- Las reglas nuevas están preparadas y probadas, pero aún no se han publicado en Firebase. Se deben coordinar con la nueva versión del cliente: publicar primero la web nueva y aplicar inmediatamente las reglas nuevas.

Se integraron los commits recientes de GitHub `5631f52` y `ec3a59f`, conservando las mejoras móviles de estilos, álbum y pantalla de entrada. La comprobación posterior a la integración aprobó nuevamente las 93 pruebas y la compilación de producción.

## Qué quedó corregido en código

- Entrada obligatoria con Google, sin vista previa privada ni acceso basado solamente en un JSON local. La pérdida de la sesión retira el contenido privado.
- Compatibilidad de publicaciones nuevas y antiguas; edición de detalles y portada sin sustituir las fotos y videos.
- Edición compartida de cartas, canciones y planes con una copia exacta de la versión anterior; archivo y restauración. Canción, color y fecha de las cartas se comparten al guardar.
- Cine: conservación separada de fuentes locales y remotas, importación con respaldo, fechas y boletos según la reserva, archivo de películas y cancelación de reservas sin eliminación definitiva. Los cambios compartidos conservan historial.
- Música: enlaces Spotify reales y catálogo Apple identificados correctamente, sin inventar identificadores Spotify.
- Juegos: identidad de partida por foto/nivel/tamaño, objetivos y reintentos corregidos; récords compartidos por cuenta. Las partidas en curso siguen en el dispositivo.
- Respaldo de la galería en ZIP por partes con archivos descargables, documentos originales y manifiesto; informa los archivos que no pudieron descargarse. Exportación de cine con reservas y respaldo de los datos locales del dispositivo.
- PWA ajustada a Next.js, con una pantalla sin conexión y sin almacenar contenido privado mediante el service worker.
- README y configuración de despliegue actualizados para Next.js y el proyecto Firebase nuevo.

## Datos conservados

El respaldo privado previo a las correcciones contiene **36 documentos**: 16 recuerdos, 1 carta, 13 películas, 3 planes y 3 canciones. Es una instantánea del 18 de octubre de 2026; no incluye publicaciones posteriores ni borradores que existan únicamente en sus navegadores.

Las correcciones no requieren borrar, restaurar ni reescribir esos documentos. El Firebase original y los archivos existentes de Cloudinary quedan fuera de estos cambios. Las reglas nuevas sólo se deben desplegar en **lezz-val-universo**. La galería anterior usa otro proyecto y no recibe automáticamente las publicaciones nuevas.

## Verificación realizada

- 93 pruebas locales aprobadas, 0 fallidas.
- Compilación de producción aprobada.
- 8 grupos de comprobaciones de reglas aprobados en un emulador aislado, incluidos los formatos de las 13 películas existentes.
- Formato ZIP leído correctamente por un lector independiente, con nombres con acentos y contenido comprobado.
- No se añadieron publicaciones ni se subieron fotos de prueba a producción.
- La comprobación visual final en navegador y el uso real con ambas cuentas siguen pendientes. Los resultados locales no equivalen a verificar la versión publicada.

## Qué falta para cerrar la publicación

1. Subir estas correcciones a la rama de GitHub conectada y esperar el despliegue correcto de Vercel.
2. Confirmar las variables de servidor de Cloudinary y las cuentas autorizadas indicadas en `.env.example`. Los secretos no deben subirse a GitHub. El dominio final ya se comprobó autorizado en Firebase y Google está habilitado.
3. Publicar únicamente las reglas de Firestore del proyecto **lezz-val-universo**, después de que esté disponible la web nueva, y comprobar la versión remota.
4. Hacer un recorrido breve con sus cuentas: acceso, lectura de contenido existente y un cambio que realmente quieran guardar. No hace falta crear contenido desechable ni borrar nada para comprobarlo.

## Funciones que siguen siendo opcionales

- Conectar una cuenta Spotify e importar su biblioteca requiere crear una aplicación de Spotify y configurar su autorización. Los enlaces y reproductores existentes no equivalen a esa conexión.
- Las notificaciones push todavía no están implementadas; los recordatorios actuales aparecen dentro de la web.
- La apertura programada de cartas es una sorpresa visual, no un bloqueo cifrado frente a la otra cuenta autorizada.
- El respaldo ZIP de la galería informa CORS, cancelaciones o archivos superiores a 110 MB; sólo se considera completo si todos se descargaron. No es una restauración automática.
- Un ZIP adicional del código es opcional porque el proyecto ya usa GitHub. No se necesita para publicar y no sustituye los respaldos de Firebase o Cloudinary.
