export type MemoryDifficulty = 4 | 6 | 8 | 10 | 12;

export type MemoryCard = {
  id: string;
  pairId: string;
  photoId: string;
  url: string;
  title: string;
  date?: string;
  location?: string;
};

export type PhotoItem = {
  id: string;
  url: string;
  title: string;
  date?: string;
  location?: string;
};

export function createMemoryDeck(
  photos: readonly PhotoItem[],
  pairCount: MemoryDifficulty,
  random: () => number = Math.random
): MemoryCard[] {
  if (photos.length === 0) return [];

  // Shuffle pool to pick random photos
  const pool = [...photos];
  for (let i = pool.length - 1; i > 0; i--) {
    const r = Math.min(i, Math.max(0, Math.floor((random() || 0) * (i + 1))));
    [pool[i], pool[r]] = [pool[r], pool[i]];
  }

  // Select pairCount photos (cycle if pool has fewer than pairCount)
  const selected: PhotoItem[] = [];
  for (let i = 0; i < pairCount; i++) {
    selected.push(pool[i % pool.length]);
  }

  // Create pairs
  const cards: MemoryCard[] = [];
  selected.forEach((photo, index) => {
    const pairId = `${photo.id}:pair-${index}`;
    cards.push({
      id: `${pairId}-a`,
      pairId,
      photoId: photo.id,
      url: photo.url,
      title: photo.title,
      date: photo.date,
      location: photo.location,
    });
    cards.push({
      id: `${pairId}-b`,
      pairId,
      photoId: photo.id,
      url: photo.url,
      title: photo.title,
      date: photo.date,
      location: photo.location,
    });
  });

  // Fisher–Yates shuffle the cards
  for (let i = cards.length - 1; i > 0; i--) {
    const r = Math.min(i, Math.max(0, Math.floor((random() || 0) * (i + 1))));
    [cards[i], cards[r]] = [cards[r], cards[i]];
  }

  return cards;
}

export function isMemoryComplete(matchedPairIds: readonly string[], pairCount: MemoryDifficulty): boolean {
  return matchedPairIds.length >= pairCount;
}
