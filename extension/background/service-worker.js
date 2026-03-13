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
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs[0]) {
          sendResponse({ success: false, error: "No active tab found" });
          return;
        }
        chrome.tabs.sendMessage(
          tabs[0].id,
          { type: "FILL_FORM", payload: payload.vehicle },
          (response) => {
            if (chrome.runtime.lastError) {
              sendResponse({
                success: false,
                error: chrome.runtime.lastError.message ||
                  "Could not connect to the page. Make sure you are on the Facebook Marketplace vehicle listing page.",
              });
            } else {
              sendResponse(response || { success: true });
            }
          }
        );
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
