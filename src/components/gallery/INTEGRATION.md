# Galería: integración sin servicios implícitos

Estos componentes no importan Firebase, Cloudinary ni clientes de red. No escriben en localStorage ni incluyen eliminación. La aplicación suministra los recuerdos y los callbacks autorizados.

## Entrada principal

```tsx
import { GalleryWorkspace, type GalleryMemory } from './components/gallery';

<GalleryWorkspace
  memories={galleryMemories}
  onEdit={saveMemoryDetails}
  onPublish={publishWithSecureService}
  favoriteIds={favoriteMemoryIds}
  onToggleFavorite={togglePersistentFavorite}
/>
```

`memories` admite `Memory[]` existente; `GalleryMemory` añade campos opcionales. La lista debe contener solo registros que la sesión tenga permiso de leer. El componente raíz debe cambiar de `key` al cambiar la identidad de sesión para descartar visores/formularios de la cuenta anterior.

- Sin `onEdit`, no aparecen controles para editar.
- Sin `onPublish`, se permite preparar archivos y previsualizarlos pero el botón Publicar queda desactivado. El texto explica que no se sube nada ni se conserva el borrador al cerrar. `canPreparePublication={false}` también oculta la entrada a ese formulario.
- Sin `onToggleFavorite`, no aparecen controles/filtro de favoritos. Con él, `favoriteIds` y persistencia quedan bajo control del llamador; el componente no atribuye favoritos locales a otra persona.
- Los callbacks deben rechazar su promesa cuando el guardado no se complete. Una promesa resuelta indica éxito; no resolver anticipadamente mientras una tarea remota siga pendiente.
- El padre actualiza `memories` después del guardado/lectura de datos. No hay mutación optimista de los recuerdos ni modificación del objeto recibido.

## Datos que es necesario conservar al adaptar el original

```ts
type GalleryMemory = Memory & {
  createdAt?: string | number | Date | { seconds: number; nanoseconds?: number } | { _seconds: number };
  coverMediaId?: string;
  reminder?: { enabled: boolean; date: string; label: string; repeat: 'once' | 'yearly' };
};
```

`normalizeMemory` conserva `date` y convierte `createdAt` a ISO para mostrar las historias. Otro adaptador debe conservar igualmente el `createdAt` original (timestamp Firebase/ISO/milisegundos) en la instancia normalizada; **no sustituirlo por photoDate/date ni por la fecha de importación**. Las historias reproducen el original: publicaciones de los últimos siete días, incluso si sus fotos son antiguas. Fechas futuras, ausentes o inválidas no se presentan como historias. Sin ese campo, la barra se omite.

La portada es `coverMediaId` si existe; de lo contrario, el primer archivo de `media`, como en el original. Los IDs de archivo deben ser estables dentro del recuerdo. El editor entrega una copia de `media` con la portada al principio: conserva todos los archivos y sus `storagePath`. El backend puede guardar únicamente el orden si el esquema no usa `coverMediaId`.

`onEdit(id, changes: GalleryEdit)` entrega título, descripción, fecha del recuerdo, lugar, álbum, etiquetas, autor, recordatorio opcional, portada y `media` reordenado. Debe mapear `date` a `photoDate` cuando el esquema remoto lo necesite. No reemplazar el documento completo: mantener campos ajenos como `createdAt`, favoritos y datos de importación. El editor no incorpora archivos nuevos ni elimina los existentes.

`onPublish(draft: GalleryPublication)` recibe metadatos, `files: File[]` y `coverIndex`. No recibe rutas remotas falsas. Un servicio seguro debe autenticar y autorizar, validar tipo/contenido/tamaño real, aplicar límites y mantener el conjunto consistente antes de escribir el recuerdo con su `createdAt` del servidor. La validación del navegador es comodidad de interfaz; no sustituye controles del servidor. No conectar un preset Cloudinary unsigned al formulario. No crear llamadas remotas hasta que exista ese servicio.

## Calendario y recordatorios

“Un día como hoy” usa fecha de calendario `YYYY-MM-DD`, día/mes coincidentes y años anteriores. El reloj se interpreta en `America/Mexico_City` y se inyecta con `now?: Date` para pruebas. No presenta recuerdos del año actual como aniversarios. El 29 de febrero conserva su fecha real y no se traslada al 28.

Los recordatorios se muestran cuando vencen en los próximos 30 días; pueden ser únicos o anuales. No envían push, email ni crean eventos externos. La repetición del 29 de febrero espera al próximo año bisiesto. Desactivar el recordatorio no elimina el recuerdo. Para visibilidad compartida, el padre debe persistir y leer `reminder` dentro del esquema autorizado.

## Exportaciones individuales

`GalleryViewer` requiere `memories`, `memoryId`, `onNavigate(id)`, `onClose()` y permite `onEdit(memory)`. Incluye filmstrip de archivos y de publicaciones, botones anterior/siguiente, video con controles sin autoplay, ampliar foto, estados de error y enlaces seguros al archivo. Las flechas recorren archivos y luego publicaciones; Alt + flechas cambia de publicación. No captura flechas al enfocar controles de video o campos. Escape y el foco se gestionan mediante el `Dialog` compartido.

También se exportan `GalleryStories`, `GalleryOnThisDay`, `GalleryAlbumGrid`, `GalleryEditDialog`, `GalleryPublicationDialog` y los contratos tipados. CSS está encapsulado bajo `galleryx-` y se importa desde los componentes. La vista de video usa un marcador de video para las miniaturas: no inventa una URL de transformación Cloudinary ni descarga todos los videos al navegar la grilla.

## Verificación

```sh
node --import tsx --test src/lib/gallery.test.ts
npm run build
```

Las pruebas cubren huso horario, fechas históricas, historias por publicación, portada sin pérdida/mutación, álbumes, recordatorios en cambio de año y 29 de febrero, y validación de archivos. El patrón actual `tests/*.test.ts` no incluye este archivo; ejecutarlo expresamente o agregarlo al conjunto de pruebas del padre durante la integración.
