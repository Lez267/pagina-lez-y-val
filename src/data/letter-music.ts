export interface LetterSong {
  id?: string;
  title: string;
  artist: string;
  artworkUrl?: string;
  previewUrl?: string;
  spotifyUrl?: string;
  catalogUrl?: string;
  startSeconds?: number;
}

export const CURATED_LETTER_SONGS: LetterSong[] = [
  {
    id: '1441416638',
    title: 'we fell in love in october',
    artist: 'girl in red',
    artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/08/dd/cd/08ddcdac-2d09-c7eb-d2ab-6b3849b04a02/5054526166202.jpg/200x200bb.jpg',
    previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/85/0b/0b/850b0b97-9255-b5f5-d05e-0e03a1e9b8e7/mzaf_9835609236239012360.plus.aac.p.m4a',
  },
  {
    id: '1122782283',
    title: 'Yellow',
    artist: 'Coldplay',
    artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music221/v4/f5/93/8c/f5938c49-964c-31d1-4b33-78b634f71fb7/190295978075.jpg/200x200bb.jpg',
    previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/66/f3/1a/66f31a76-a6ed-cb4c-f353-23310a7ae9a8/mzaf_10593596652344378873.plus.aac.p.m4a',
  },
  {
    id: '727494441',
    title: 'Dulce Soledad',
    artist: 'Enjambre',
    artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music113/v4/2c/aa/d0/2caad0c3-6bc5-2148-f0bb-16551c8dfe16/05099991760456.rgb.jpg/200x200bb.jpg',
    previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/6e/0b/16/6e0b1651-3989-7c56-b8a4-7d07599b4168/mzaf_3284769617460277443.plus.aac.p.m4a',
  },
  {
    id: '1440832990',
    title: 'Amor Completo',
    artist: 'Mon Laferte',
    artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/93/d0/4a/93d04ae9-c2bc-dfe9-6bdc-8d1f92647405/16UMGIM02512.rgb.jpg/200x200bb.jpg',
    previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/cf/de/96/cfde9636-88a5-ca62-06de-e5111d471501/mzaf_16739751041575702200.plus.aac.p.m4a',
  },
  {
    id: '1468058173',
    title: 'Lover',
    artist: 'Taylor Swift',
    artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/49/3d/ab/493dab54-f920-9043-6181-80993b8116c9/19UMGIM53909.rgb.jpg/200x200bb.jpg',
    previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/e0/db/47/e0db47b0-7f70-0631-0414-cd4777d2fb3e/mzaf_6362891154838442638.plus.aac.p.m4a',
  },
  {
    id: '1622045962',
    title: 'Ojitos Lindos',
    artist: 'Bad Bunny & Bomba Estéreo',
    artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/3e/04/eb/3e04ebf6-370f-f59d-ec84-2c2643db92f1/196626945068.jpg/200x200bb.jpg',
    previewUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/72/ae/81/72ae81c2-4ef3-b998-40b6-563c0609509f/mzaf_12868850384306577273.plus.aac.p.m4a',
  },
];

export async function searchLetterSongs(query: string): Promise<LetterSong[]> {
  const q = query.trim();
  if (!q) return CURATED_LETTER_SONGS;

  try {
    const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=song&limit=8`);
    if (!res.ok) return [];
    const data = (await res.json()) as { results?: any[] };
    if (!Array.isArray(data.results)) return [];

    return data.results
      .filter((r: any) => Number.isSafeInteger(r.trackId) && typeof r.trackName === 'string' && typeof r.artistName === 'string' && typeof r.previewUrl === 'string' && r.previewUrl.startsWith('https://'))
      .map((r: any) => ({
        id: String(r.trackId),
        title: r.trackName || 'Sin título',
        artist: r.artistName || 'Artista desconocido',
        artworkUrl: typeof r.artworkUrl100 === 'string' ? r.artworkUrl100.replace('100x100bb', '200x200bb') : undefined,
        previewUrl: r.previewUrl,
        catalogUrl: typeof r.trackViewUrl === 'string' ? r.trackViewUrl : undefined,
      }));
  } catch {
    return [];
  }
}
