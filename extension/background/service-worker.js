var SITE_URLS = {
  facebook: "https://www.facebook.com/marketplace/create/vehicle",
  craigslist: "https://post.craigslist.org/",
  offerup: "https://offerup.com/post/"
};

var fillLog = [];
var MAX_LOG_ENTRIES = 60;

function vehicleKey(v) {
  if (v.vin && v.vin.length >= 6) return "vin:" + v.vin.toUpperCase();
  if (v.stockNumber && v.stockNumber.length >= 2) return "stk:" + v.stockNumber;
  return "id:" + v.id;
}

async function ensureContentScript(tabId) {
  try {
    var resp = await chrome.tabs.sendMessage(tabId, { type: "PING" });
    if (resp && resp.alive) return true;
  } catch (e) {
  }
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ["fill-engine.js", "form-scanner.js", "ai-mapper.js", "mapping-cache.js", "content.js"]
    });
    await new Promise(function (r) { setTimeout(r, 800); });
    return true;
  } catch (e) {
    return false;
  }
}

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  var type = message.type;
  var payload = message.payload;

  if (type === "FILL_STATUS") {
    var entry = {
      step: (payload && payload.step) || "",
      detail: (payload && payload.detail) || "",
      ts: Date.now()
    };
    fillLog.push(entry);
    if (fillLog.length > MAX_LOG_ENTRIES) fillLog.shift();
    return; // no response needed; popup receives it directly
  }

  switch (type) {
    case "SAVE_INVENTORY": {
      chrome.storage.local.set({ autimik_inventory: payload.vehicles }, function () {
        sendResponse({ success: true, count: payload.vehicles.length });
      });
      return true;
    }

    case "GET_INVENTORY": {
      chrome.storage.local.get("autimik_inventory", function (result) {
        sendResponse({ success: true, vehicles: result.autimik_inventory || [] });
      });
      return true;
    }

    case "GET_FILL_LOG": {
      sendResponse({ success: true, log: fillLog });
      return true;
    }

    case "LIST_VEHICLE": {
      fillLog = []; // reset log for new fill
      var targetSite = payload.targetSite || "facebook";

      function getTargetUrl(site, callback) {
        if (site === "current") {
          chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (tabs[0]) {
              callback(null, tabs[0]);
            } else {
              callback("No active tab found");
            }
          });
        } else {
          callback(null, null);
        }
      }

      getTargetUrl(targetSite, function (err, existingTab) {
        if (err) {
          sendResponse({ success: false, error: err });
          return;
        }

        if (targetSite === "current" && existingTab) {
          sendFillMessage(existingTab.id, payload.vehicle, sendResponse);
          return;
        }

        var targetUrl = SITE_URLS[targetSite] || SITE_URLS.facebook;

        chrome.tabs.query({}, function (allTabs) {
          var matchingTab = allTabs.find(function (t) {
            return t.url && t.url.startsWith(targetUrl);
          });

          if (matchingTab) {
            chrome.tabs.update(matchingTab.id, { active: true }, function () {
              chrome.windows.update(matchingTab.windowId, { focused: true }, function () {
                setTimeout(function () {
                  sendFillMessage(matchingTab.id, payload.vehicle, sendResponse);
                }, 500);
              });
            });
          } else {
            chrome.tabs.create({ url: targetUrl, active: true }, function (newTab) {
              function onUpdated(tabId, info) {
                if (tabId === newTab.id && info.status === "complete") {
                  chrome.tabs.onUpdated.removeListener(onUpdated);
                  clearTimeout(safetyTimeout);
                  setTimeout(function () {
                    sendFillMessage(newTab.id, payload.vehicle, sendResponse);
                  }, 1500);
                }
              }
              chrome.tabs.onUpdated.addListener(onUpdated);
              var safetyTimeout = setTimeout(function () {
                chrome.tabs.onUpdated.removeListener(onUpdated);
                sendFillMessage(newTab.id, payload.vehicle, sendResponse);
              }, 20000);
            });
          }
        });
      });
      return true;
    }

    case "MARK_LISTED": {
      chrome.storage.local.get("autimik_listed", function (result) {
        var listed = result.autimik_listed || {};
        listed[payload.vehicleKey] = { timestamp: Date.now() };
        chrome.storage.local.set({ autimik_listed: listed }, function () {
          sendResponse({ success: true });
        });
      });
      return true;
    }

    case "GET_LISTED": {
      chrome.storage.local.get("autimik_listed", function (result) {
        sendResponse({ success: true, listed: result.autimik_listed || {} });
      });
      return true;
    }

    case "CLEAR_INVENTORY": {
      chrome.storage.local.remove(["autimik_inventory", "autimik_listed"], function () {
        sendResponse({ success: true });
      });
      return true;
    }

    case "SAVE_API_KEY": {
      chrome.storage.sync.set({ autimik_api_key: payload.apiKey }, function () {
        sendResponse({ success: true });
      });
      return true;
    }

    case "GET_API_KEY": {
      chrome.storage.sync.get("autimik_api_key", function (result) {
        sendResponse({ success: true, apiKey: result.autimik_api_key || "" });
      });
      return true;
    }

    case "CLEAR_SITE_CACHE": {
      chrome.storage.local.remove("autimik_ai_mappings", function () {
        sendResponse({ success: true });
      });
      return true;
    }

    case "START_TRAINING": {
      ensureContentScript(payload.tabId).then(function () {
        chrome.scripting.executeScript({ target: { tabId: payload.tabId }, files: ["trainer.js"] })
          .then(function () {
            chrome.tabs.sendMessage(payload.tabId, { type: "START_TRAINING" }, function () {
              sendResponse({ success: true });
            });
          })
          .catch(function (err) { sendResponse({ success: false, error: err.message }); });
      });
      return true;
    }

    case "STOP_TRAINING": {
      chrome.tabs.sendMessage(payload.tabId, { type: "STOP_TRAINING" }, function () {
        sendResponse({ success: true });
      });
      return true;
    }

    case "SAVE_ADAPTER": {
      chrome.storage.local.get("autimik_custom_adapters", function (result) {
        var adapters = result.autimik_custom_adapters || {};
        adapters[payload.hostname] = payload.adapter;
        chrome.storage.local.set({ autimik_custom_adapters: adapters }, function () {
          sendResponse({ success: true });
        });
      });
      return true;
    }

    case "GET_CUSTOM_ADAPTERS": {
      chrome.storage.local.get("autimik_custom_adapters", function (result) {
        sendResponse({ success: true, adapters: result.autimik_custom_adapters || {} });
      });
      return true;
    }

    case "DELETE_CUSTOM_ADAPTER": {
      chrome.storage.local.get("autimik_custom_adapters", function (result) {
        var adapters = result.autimik_custom_adapters || {};
        delete adapters[payload.hostname];
        chrome.storage.local.set({ autimik_custom_adapters: adapters }, function () {
          sendResponse({ success: true });
        });
      });
      return true;
    }

    case "FETCH_IMAGE": {
      var url = payload.url;
      fetch(url)
        .then(function (response) {
          if (!response.ok) throw new Error("HTTP " + response.status);
          return response.blob();
        })
        .then(function (blob) {
          var reader = new FileReader();
          reader.onloadend = function () {
            sendResponse({
              success: true,
              dataUrl: reader.result,
              mimeType: blob.type || "image/jpeg"
            });
          };
          reader.readAsDataURL(blob);
        })
        .catch(function (err) {
          sendResponse({ success: false, error: err.message });
        });
      return true;
    }

    default:
      sendResponse({ success: false, error: "Unknown message type: " + type });
      return true;
  }
});

function sendFillMessage(tabId, vehicle, sendResponse) {
  ensureContentScript(tabId).then(function () {
    chrome.tabs.sendMessage(
      tabId,
      { type: "FILL_FORM", payload: vehicle },
      function (response) {
        if (chrome.runtime.lastError) {
          sendResponse({
            success: false,
            error: chrome.runtime.lastError.message || "Could not connect to the page. Try refreshing the tab and clicking List It again."
          });
          return;
        }
        var result = response || { success: true };
        if (result.success) {
          var key = vehicleKey(vehicle);
          chrome.storage.local.get("autimik_listed", function (stored) {
            var listed = stored.autimik_listed || {};
            listed[key] = { timestamp: Date.now() };
            chrome.storage.local.set({ autimik_listed: listed });
          });
        }
        sendResponse(result);
      }
    );
  });
}
