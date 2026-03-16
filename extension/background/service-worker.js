function vehicleKey(v) {
  if (v.vin && v.vin.length >= 6) return "vin:" + v.vin.toUpperCase();
  if (v.stockNumber && v.stockNumber.length >= 2) return "stk:" + v.stockNumber;
  return "id:" + v.id;
}

async function ensureContentScript(tabId) {
  try {
    const resp = await chrome.tabs.sendMessage(tabId, { type: "PING" });
    if (resp && resp.alive) return true;
  } catch (e) {
    // Not loaded — inject
  }
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content.js"],
    });
    await new Promise((r) => setTimeout(r, 800));
    return true;
  } catch (e) {
    return false;
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { type, payload } = message;

  switch (type) {
    case "SAVE_INVENTORY": {
      chrome.storage.local.set({ autimik_inventory: payload.vehicles }, () => {
        sendResponse({ success: true, count: payload.vehicles.length });
      });
      return true;
    }

    case "GET_INVENTORY": {
      chrome.storage.local.get("autimik_inventory", (result) => {
        sendResponse({ success: true, vehicles: result.autimik_inventory || [] });
      });
      return true;
    }

    case "LIST_VEHICLE": {
      const FB_CREATE_URL = "https://www.facebook.com/marketplace/create/vehicle";

      chrome.tabs.query({}, (allTabs) => {
        const fbTab = allTabs.find(
          (t) => t.url && t.url.startsWith(FB_CREATE_URL)
        );

        async function sendFillMessage(tabId) {
          await ensureContentScript(tabId);
          chrome.tabs.sendMessage(
            tabId,
            { type: "FILL_FORM", payload: payload.vehicle },
            (response) => {
              if (chrome.runtime.lastError) {
                sendResponse({
                  success: false,
                  error:
                    chrome.runtime.lastError.message ||
                    "Could not connect to the page. Try refreshing the Facebook tab and clicking List It again.",
                });
                return;
              }
              const result = response || { success: true };
              // Write to storage immediately so popup re-open picks it up even if it was closed mid-fill
              if (result.success) {
                const key = vehicleKey(payload.vehicle);
                chrome.storage.local.get("autimik_listed", (stored) => {
                  const listed = stored.autimik_listed || {};
                  listed[key] = { timestamp: Date.now() };
                  chrome.storage.local.set({ autimik_listed: listed });
                });
              }
              sendResponse(result);
            }
          );
        }

        if (fbTab) {
          chrome.tabs.update(fbTab.id, { active: true }, () => {
            chrome.windows.update(fbTab.windowId, { focused: true }, () => {
              setTimeout(() => sendFillMessage(fbTab.id), 500);
            });
          });
        } else {
          chrome.tabs.create({ url: FB_CREATE_URL, active: true }, (newTab) => {
            function onUpdated(tabId, info) {
              if (tabId === newTab.id && info.status === "complete") {
                chrome.tabs.onUpdated.removeListener(onUpdated);
                clearTimeout(safetyTimeout);
                setTimeout(() => sendFillMessage(newTab.id), 1500);
              }
            }
            chrome.tabs.onUpdated.addListener(onUpdated);
            const safetyTimeout = setTimeout(() => {
              chrome.tabs.onUpdated.removeListener(onUpdated);
              sendFillMessage(newTab.id);
            }, 20000);
          });
        }
      });
      return true;
    }

    case "MARK_LISTED": {
      chrome.storage.local.get("autimik_listed", (result) => {
        const listed = result.autimik_listed || {};
        listed[payload.vehicleKey] = { timestamp: Date.now() };
        chrome.storage.local.set({ autimik_listed: listed }, () => {
          sendResponse({ success: true });
        });
      });
      return true;
    }

    case "GET_LISTED": {
      chrome.storage.local.get("autimik_listed", (result) => {
        sendResponse({ success: true, listed: result.autimik_listed || {} });
      });
      return true;
    }

    case "CLEAR_INVENTORY": {
      chrome.storage.local.remove(["autimik_inventory", "autimik_listed"], () => {
        sendResponse({ success: true });
      });
      return true;
    }

    case "FETCH_IMAGE": {
      const url = payload.url;
      fetch(url)
        .then((response) => {
          if (!response.ok) throw new Error("HTTP " + response.status);
          return response.blob();
        })
        .then((blob) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            sendResponse({
              success: true,
              dataUrl: reader.result,
              mimeType: blob.type || "image/jpeg",
            });
          };
          reader.readAsDataURL(blob);
        })
        .catch((err) => {
          sendResponse({ success: false, error: err.message });
        });
      return true;
    }

    default:
      sendResponse({ success: false, error: "Unknown message type: " + type });
      return true;
  }
});
