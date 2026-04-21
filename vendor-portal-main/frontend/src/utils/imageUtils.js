/**
 * Converts any image URL to a fully-qualified URL pointing to the configured
 * backend server, so images are visible from ALL devices on the network.
 *
 * Handles three cases:
 *  1. Relative paths  (e.g. "/uploads/abc.png")  → prepend backend server root
 *  2. localhost/127.0.0.1 URLs stored in old records → replace host with real LAN IP
 *  3. Already-correct absolute URLs (LAN IP or Supabase CDN) → return as-is
 */
export const getFullImageUrl = (url) => {
  if (!url) return '';

  // Blob/Data URLs are local browser previews — always valid on current device
  if (url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }

  // Resolve the configured backend server root from the env variable
  const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';
  let backendRoot = apiBase
    .replace(/\/api\/v1\/?$/, '') // strip /api/v1 suffix
    .replace(/\/$/, '');          // strip trailing slash

  // For absolute URLs: replace localhost / 127.0.0.1 with the real backend host
  // This fixes images uploaded before the LAN IP was configured in BASE_URL
  if (url.startsWith('http://') || url.startsWith('https://')) {
    try {
      const parsed = new URL(url);
      const backendParsed = new URL(backendRoot);

      const isLocal =
        parsed.hostname === 'localhost' ||
        parsed.hostname === '127.0.0.1';

      if (isLocal) {
        // Replace hostname (and port) with the real backend server
        parsed.hostname = backendParsed.hostname;
        parsed.port = backendParsed.port;
        return parsed.toString();
      }
    } catch (_) {
      // Malformed URL — fall through and return as-is
    }
    return url; // already an absolute non-local URL (LAN IP / CDN)
  }

  // Relative path — prepend backend root
  const relativeUrl = url.startsWith('/') ? url : `/${url}`;
  return `${backendRoot}${relativeUrl}`;
};

