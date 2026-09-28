/**
 * Resolve paths to files in `public` from the site root. URLs already pointing
 * to a remote host, an embedded image, or an absolute site path stay intact.
 */
export function normalizeImageUrl(value: string | null | undefined): string | null {
  const url = value?.trim();
  if (!url) return null;
  if (/^(?:[a-z][a-z\d+.-]*:|\/)/i.test(url)) return url;
  return `/${url}`;
}
