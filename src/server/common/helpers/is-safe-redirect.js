// Blocks open redirects — only allows paths on this origin (e.g. "/cookies"), never external URLs or "//evil.com".
export function isSafeRedirect(url) {
  if (!url || typeof url !== 'string') {
    return false
  }
  return url.startsWith('/') && !url.startsWith('//')
}
