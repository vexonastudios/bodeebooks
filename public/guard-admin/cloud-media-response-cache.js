(function(root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CloudMediaResponseCache = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';
  function createMediaResponseCache() {
    const entries = new Map(); let scope = null, size = 0;
    function clear() { entries.clear(); size = 0; }
    return {
      async request(identity, change, send) {
        if (identity !== scope) { clear(); scope = identity; }
        const currentScope = scope;
        const read = change.method === 'GET' && /^\/api\/(music|video|audiobooks|learning-videos)\//.test(change.path);
        const key = change.path, cached = read ? entries.get(key) : null;
        const result = await send({ ...change, ...(cached ? { ifNoneMatch: cached.etag } : {}) });
        if (scope !== currentScope) throw Error('The media account changed.');
        if (result.notModified) {
          if (!cached || result.etag !== cached.etag) throw Error('Reopen this media library.');
          return JSON.parse(cached.json);
        }
        if (read && /^[a-f0-9]{64}$/.test(result.etag || '')) {
          const json = JSON.stringify(result);
          if (cached) { entries.delete(key); size -= cached.json.length; }
          if (json.length <= 1000000) {
            while (entries.size && (size + json.length > 4000000 || entries.size >= 64)) {
              const first = entries.keys().next().value; size -= entries.get(first).json.length; entries.delete(first);
            }
            entries.set(key, { etag: result.etag, json }); size += json.length;
          }
        }
        return result;
      }, clear
    };
  }
  return { createMediaResponseCache };
});
