export type MediaItem = { id: string; url: string; type: 'image' | 'video'; storagePath?: string };
export type Memory = { id: string; title: string; description: string; date: string; location: string; tags: string[]; album: string; author: string; media: MediaItem[]; favorites: string[]; source: 'demo' | 'firebase' | 'import' };
export type GallerySession = { memories: Memory[]; uid: string; displayName: string };
export type Page = 'home' | 'memories' | 'timeline' | 'letters' | 'music' | 'games' | 'plans' | 'gifts';
