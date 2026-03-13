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

        function sendFillMessage(tabId) {
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
              } else {
                sendResponse(response || { success: true });
              }
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
                setTimeout(() => sendFillMessage(newTab.id), 1500);
              }
            }
            chrome.tabs.onUpdated.addListener(onUpdated);
            setTimeout(() => {
              chrome.tabs.onUpdated.removeListener(onUpdated);
            }, 30000);
          });
        }
      });
      return true;
    }

    case "MARK_LISTED": {
      chrome.storage.local.get("autimik_listed", (result) => {
        const listed = result.autimik_listed || {};
        listed[payload.vehicleId] = { timestamp: Date.now() };
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

    default:
      sendResponse({ success: false, error: "Unknown message type: " + type });
      return true;
  }
});
