var MappingCache = (function () {
  var CACHE_KEY = "autimik_ai_mappings";
  var TTL_MS = 7 * 24 * 60 * 60 * 1000;

  function log(...args) {
    console.log("[Autimik:MappingCache]", ...args);
  }

  function getDomain(url) {
    try {
      return new URL(url).hostname;
    } catch (e) {
      return url;
    }
  }

  function getCache() {
    return new Promise(function (resolve) {
      chrome.storage.local.get(CACHE_KEY, function (result) {
        resolve(result[CACHE_KEY] || {});
      });
    });
  }

  function saveCache(cache) {
    return new Promise(function (resolve) {
      var obj = {};
      obj[CACHE_KEY] = cache;
      chrome.storage.local.set(obj, resolve);
    });
  }

  async function get(url) {
    var domain = getDomain(url);
    var cache = await getCache();
    var entry = cache[domain];
    if (!entry) {
      log("No cached mapping for", domain);
      return null;
    }
    if (Date.now() - entry.timestamp > TTL_MS) {
      log("Cached mapping expired for", domain);
      delete cache[domain];
      await saveCache(cache);
      return null;
    }
    log("Found cached mapping for", domain, "with", entry.mapping.length, "fields");
    return entry.mapping;
  }

  async function set(url, mapping) {
    var domain = getDomain(url);
    var cache = await getCache();
    cache[domain] = {
      mapping: mapping,
      timestamp: Date.now()
    };
    await saveCache(cache);
    log("Saved mapping for", domain, "with", mapping.length, "fields");
  }

  async function clearAll() {
    await new Promise(function (resolve) {
      chrome.storage.local.remove(CACHE_KEY, resolve);
    });
    log("Cleared all cached mappings");
  }

  return {
    get: get,
    set: set,
    clearAll: clearAll,
    getDomain: getDomain
  };
})();
