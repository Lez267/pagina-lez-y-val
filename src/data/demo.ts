import type { Memory } from './types';

export const RELATIONSHIP_START = '2026-04-17';

const memory = (id: number, title: string, date: string, description: string, image: number, author: 'Ale' | 'Val', location: string, album: string, tags: string[] = ['juntos']): Memory => ({
  id: `demo-${id}`, title, date, description: `Recuerdo de ejemplo. ${description}`, location, album, tags, author,
  media: [{ id: `demo-${id}-media-1`, url: `/images/memory-${image}.jpg`, type: 'image' }],
  favorites: id % 2 ? ['Ale', 'Val'] : [], source: 'demo',
});

/** Fictional sample content. These are not the couple's actual memories. */
export const demoMemories: Memory[] = [
  memory(1, 'El comienzo de todo', '2026-04-17', 'Un primer capítulo para guardar con cariño.', 1, 'Ale', 'Un lugar especial', 'Nuestros comienzos'),
  memory(2, 'Un café y mil historias', '2026-04-25', 'Una tarde tranquila, una charla que no queríamos terminar.', 2, 'Val', 'Nuestra cafetería', 'Citas favoritas', ['dates']),
  memory(3, 'Donde sea, contigo', '2026-05-10', 'Una caminata sin prisa y un montón de pequeñas sonrisas.', 3, 'Ale', 'Un paseo juntos', 'Pequeñas aventuras'),
  memory(4, 'Nuestra hora dorada', '2026-06-20', 'El cielo se puso bonito y quisimos guardar ese momento.', 4, 'Val', 'Un atardecer', 'Pequeñas aventuras'),
  memory(5, 'Los días sencillos', '2026-07-04', 'No hacía falta un gran plan para pasarla bien.', 5, 'Ale', 'Nuestro rincón', 'Lo cotidiano'),
  memory(6, 'Una noche para recordar', '2026-08-01', 'Luces, risas y una canción que ahora significa algo más.', 6, 'Val', 'Una cita de verano', 'Citas favoritas', ['dates']),
  memory(7, 'Cinco meses de historias', '2026-09-17', 'Una pequeña celebración y muchas ganas de seguir sumando recuerdos.', 1, 'Ale', 'Un lugar especial', 'Nuestros comienzos'),
  memory(8, 'Otro capítulo bonito', '2026-10-01', 'Un plan improvisado que terminó siendo de nuestros favoritos.', 3, 'Val', 'Una escapada', 'Pequeñas aventuras'),
];
