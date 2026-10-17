/** Stable local namespace for a specific backup's normalized content. No upload. */
export async function importIdentity(records: unknown[]): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(records));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return `nh:import:${Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2,'0')).join('')}`;
}
