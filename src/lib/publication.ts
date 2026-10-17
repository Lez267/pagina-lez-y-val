/** Compare a retry against a saved publication, independent of map key order.
 * Arrays retain their order: a different media sequence is different content.
 */
export function samePublicationValue(saved: unknown, expected: unknown): boolean {
  if (saved === expected) return true;
  if (saved === null || expected === null || typeof saved !== 'object' || typeof expected !== 'object') return false;
  if (Array.isArray(saved) || Array.isArray(expected)) {
    return Array.isArray(saved) && Array.isArray(expected) && saved.length === expected.length
      && saved.every((value, index) => samePublicationValue(value, expected[index]));
  }
  const left = saved as Record<string, unknown>, right = expected as Record<string, unknown>;
  return Object.keys(left).length === Object.keys(right).length
    && Object.entries(right).every(([key, value]) => Object.hasOwn(left, key) && samePublicationValue(left[key], value));
}
