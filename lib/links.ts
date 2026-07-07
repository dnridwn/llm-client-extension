const SAFE_SCHEMES = new Set(['http:', 'https:', 'mailto:']);

export function isSafeUrl(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return false;
  try {
    const url = new URL(trimmed);
    return SAFE_SCHEMES.has(url.protocol);
  } catch {
    return false;
  }
}

export function openExternalUrl(raw: string): void {
  const href = raw.trim();
  if (!isSafeUrl(href)) return;
  try {
    if (browser?.tabs?.create) {
      browser.tabs.create({ url: href, active: true });
      return;
    }
  } catch {
    // ignore and fall back
  }
  window.open(href, '_blank', 'noopener,noreferrer');
}