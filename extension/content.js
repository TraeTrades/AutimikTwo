function log(...args) {
  console.log("[Autimik]", ...args);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// Strip formatting (commas, spaces, $) before comparing — prevents "24,999".includes("24999") → false
function normalizeForVerify(s) {
  return String(s).replace(/[^0-9a-zA-Z]/g, "").toLowerCase();
}

// Translate DMS abbreviations to the full text Facebook shows in dropdowns
const DROPDOWN_VALUE_MAP = {
  // Drivetrain
  "awd":              "all-wheel drive",
  "4wd":              "four-wheel drive",
  "4x4":              "four-wheel drive",
  "fwd":              "front-wheel drive",
  "rwd":              "rear-wheel drive",
  "2wd":              "rear-wheel drive",
  // Transmission
  "auto":             "automatic transmission",
  "automatic":        "automatic transmission",
  "at":               "automatic transmission",
  "manual":           "manual transmission",
  "mt":               "manual transmission",
  "cvt":              "cvt transmission",
  // Fuel type
  "gas":              "gasoline",
  "unleaded":         "gasoline",
  "phev":             "plug-in hybrid",
  "plug-in hybrid":   "plug-in hybrid",
  "plug in hybrid":   "plug-in hybrid",
  "electric":         "electric",
  "ev":               "electric",
  "diesel":           "diesel",
  "hybrid":           "hybrid",
  "flex":             "flex fuel",
  "flex fuel":        "flex fuel",
  "e85":              "flex fuel",
  // Condition
  "new":              "new",
  "used":             "used - good",
  "cpo":              "used - like new",
  "certified":        "used - like new",
  "excellent":        "used - like new",
  "good":             "used - good",
  "fair":             "used - fair",
  // Body style / vehicle type
  "suv":              "suv / crossover",
  "crossover":        "suv / crossover",
  "cuv":              "suv / crossover",
  "truck":            "truck",
  "pickup":           "truck",
  "pickup truck":     "truck",
  "sedan":            "sedan",
  "coupe":            "coupe",
  "convertible":      "convertible",
  "minivan":          "van / minivan",
  "van":              "van / minivan",
  "cargo van":        "van / minivan",
  "passenger van":    "van / minivan",
  "wagon":            "wagon",
  "hatchback":        "hatchback",
};

function mapDropdownValue(value) {
  const key = String(value).toLowerCase().trim();
  return DROPDOWN_VALUE_MAP[key] || key;
}

function waitFor(selectors, timeout = 12000) {
  const selectorList = Array.isArray(selectors) ? selectors : [selectors];
  return new Promise((resolve, reject) => {
    for (const sel of selectorList) {
      const el = document.querySelector(sel);
      if (el) {
        log("Found element immediately:", sel);
        return resolve(el);
      }
    }

    const observer = new MutationObserver(() => {
      for (const sel of selectorList) {
        const el = document.querySelector(sel);
        if (el) {
          log("Found element via observer:", sel);
          observer.disconnect();
          clearTimeout(timer);
          resolve(el);
          return;
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    const timer = setTimeout(() => {
      observer.disconnect();
      reject(new Error("Timeout waiting for: " + selectorList.join(" | ")));
    }, timeout);
  });
}

function setNativeValue(element, value) {
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value"
  )?.set;
  const nativeTextareaValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLTextAreaElement.prototype,
    "value"
  )?.set;

  const setter =
    element.tagName === "TEXTAREA" ? nativeTextareaValueSetter : nativeInputValueSetter;

  if (setter) {
    setter.call(element, value);
  } else {
    element.value = value;
  }

  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

async function fillInput(label, value, fallbackSelectors) {
  if (!value) return { field: label, status: "skipped" };

  const selectors = [
    `input[aria-label="${label}"]`,
    `textarea[aria-label="${label}"]`,
    ...(fallbackSelectors || []),
  ];

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const el = await waitFor(selectors, 8000);
      el.scrollIntoView({ block: "center", behavior: "instant" });
      el.focus();
      await sleep(100);
      setNativeValue(el, String(value));
      await sleep(150);

      const actual = el.value || "";
      const expectedNorm = normalizeForVerify(String(value)).substring(0, 8);
      if (normalizeForVerify(actual).includes(expectedNorm)) {
        log("Filled", label, "with:", value);
        return { field: label, status: "filled", value };
      }

      el.click();
      await sleep(200);
      setNativeValue(el, String(value));
      el.blur();
      await sleep(200);

      const recheck = el.value || "";
      if (normalizeForVerify(recheck).includes(expectedNorm)) {
        log("Filled", label, "(retry) with:", value);
        return { field: label, status: "filled", value };
      }
    } catch (e) {
      if (attempt === 3) return { field: label, status: "failed", error: e.message };
      await sleep(500);
    }
  }
  return { field: label, status: "failed", error: "Exhausted retries" };
}

async function selectDropdown(label, value) {
  if (!value) {
    log("Skipping empty dropdown:", label);
    return;
  }
  try {
    const trigger = await waitFor([
      `[aria-label="${label}"]`,
      `[aria-label*="${label}"]`,
      `[data-testid*="${label.toLowerCase().replace(/\s+/g, '')}"]`,
    ]);
    log("Opening dropdown:", label);
    trigger.click();
    await sleep(400);

    const normalizedValue = mapDropdownValue(value);
    const options = document.querySelectorAll('[role="option"], [role="listbox"] [role="option"]');
    let matched = false;
    for (const opt of options) {
      const text = (opt.textContent || "").toLowerCase().trim();
      if (text === normalizedValue || text.includes(normalizedValue)) {
        log("Selecting option:", opt.textContent);
        opt.click();
        matched = true;
        break;
      }
    }
    if (!matched) {
      const allOptions = document.querySelectorAll('[role="option"]');
      for (const opt of allOptions) {
        const text = (opt.textContent || "").toLowerCase().trim();
        if (text === normalizedValue || text.includes(normalizedValue)) {
          log("Selecting option (broad search):", opt.textContent);
          opt.click();
          matched = true;
          break;
        }
      }
    }
    if (!matched) {
      log("No matching option found for", label, ":", value);
      document.body.click();
    }
    await sleep(300);
  } catch (e) {
    log("Could not select dropdown", label, ":", e.message);
  }
}

async function fillDescription(text) {
  if (!text) return;
  const selectors = [
    'textarea[aria-label="Description"]',
    'div[role="textbox"][aria-label*="escription"]',
    'div[contenteditable="true"]',
  ];
  try {
    const el = await waitFor(selectors);
    log("Filling description");
    if (el.tagName === "TEXTAREA" || el.tagName === "INPUT") {
      setNativeValue(el, text);
    } else {
      el.focus();
      el.textContent = "";
      document.execCommand("insertText", false, text);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }
    log("Description filled");
  } catch (e) {
    log("Could not fill description:", e.message);
  }
}

function fetchImageViaBackground(url) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: "FETCH_IMAGE", payload: { url } },
      (response) => {
        if (chrome.runtime.lastError) {
          return reject(new Error(chrome.runtime.lastError.message));
        }
        if (!response || !response.success) {
          return reject(new Error((response && response.error) || "Unknown fetch error"));
        }
        resolve(response);
      }
    );
  });
}

function dataUrlToBlob(dataUrl) {
  const parts = dataUrl.split(",");
  const mime = parts[0].match(/:(.*?);/)[1];
  const raw = atob(parts[1]);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

async function uploadPhotos(imageUrls) {
  if (!imageUrls || imageUrls.length === 0) {
    log("No images to upload");
    return;
  }
  try {
    const fileInput = await waitFor(['input[type="file"][accept*="image"]']);
    log("Found file input, fetching", imageUrls.length, "images via background");
    const files = [];
    for (const url of imageUrls) {
      try {
        log("Fetching image via background:", url);
        const result = await fetchImageViaBackground(url);
        const blob = dataUrlToBlob(result.dataUrl);
        const fileName = url.split("/").pop()?.split("?")[0] || "vehicle.jpg";
        const file = new File([blob], fileName, { type: result.mimeType || blob.type || "image/jpeg" });
        files.push(file);
      } catch (e) {
        log("Failed to fetch image:", url, e.message);
      }
    }
    if (files.length > 0) {
      const dt = new DataTransfer();
      files.forEach((f) => dt.items.add(f));
      fileInput.files = dt.files;
      fileInput.dispatchEvent(new Event("change", { bubbles: true }));
      log("Uploaded", files.length, "photos");
    }
  } catch (e) {
    log("Could not upload photos:", e.message);
  }
}

function buildDescription(vehicle) {
  const lines = [];
  if (vehicle.year && vehicle.make && vehicle.model) {
    lines.push(`${vehicle.year} ${vehicle.make} ${vehicle.model}`);
  }
  if (vehicle.trim) lines.push(`Trim: ${vehicle.trim}`);
  if (vehicle.mileage) lines.push(`Mileage: ${vehicle.mileage} miles`);
  if (vehicle.transmission) lines.push(`Transmission: ${vehicle.transmission}`);
  if (vehicle.drivetrain) lines.push(`Drivetrain: ${vehicle.drivetrain}`);
  if (vehicle.fuelType) lines.push(`Fuel Type: ${vehicle.fuelType}`);
  if (vehicle.exteriorColor) lines.push(`Exterior Color: ${vehicle.exteriorColor}`);
  if (vehicle.interiorColor) lines.push(`Interior Color: ${vehicle.interiorColor}`);
  if (vehicle.vin) lines.push(`VIN: ${vehicle.vin}`);
  if (vehicle.stockNumber) lines.push(`Stock #: ${vehicle.stockNumber}`);
  lines.push("");
  lines.push("Contact us for more details and to schedule a test drive!");
  return lines.join("\n");
}

const REQUIRED_FIELDS = ["Price", "Year", "Make", "Model"];

async function fillForm(vehicle) {
  log("Starting form fill for:", vehicle.year, vehicle.make, vehicle.model);
  const results = [];

  const fields = [
    { label: "Price", value: vehicle.price, fallback: ['input[placeholder*="Price"]', 'input[name*="price"]'] },
    { label: "Year", value: vehicle.year, fallback: ['input[placeholder*="Year"]'] },
    { label: "Make", value: vehicle.make, fallback: ['input[placeholder*="Make"]'] },
    { label: "Model", value: vehicle.model, fallback: ['input[placeholder*="Model"]'] },
    { label: "Mileage", value: vehicle.mileage, fallback: ['input[placeholder*="Mileage"]', 'input[placeholder*="miles"]'] },
  ];

  for (const { label, value, fallback } of fields) {
    const result = await fillInput(label, value, fallback);
    results.push(result);
    await sleep(500);
  }

  await selectDropdown("Condition", vehicle.condition || "Used");
  await selectDropdown("Fuel type", vehicle.fuelType);
  await selectDropdown("Transmission", vehicle.transmission);
  await selectDropdown("Drivetrain", vehicle.drivetrain);
  await selectDropdown("Exterior color", vehicle.exteriorColor);
  await selectDropdown("Interior color", vehicle.interiorColor);
  await selectDropdown("Vehicle type", vehicle.bodyStyle);

  const description = vehicle.description || buildDescription(vehicle);
  await fillDescription(description);

  const imageUrls = [];
  if (vehicle.imageUrls && Array.isArray(vehicle.imageUrls) && vehicle.imageUrls.length > 0) {
    imageUrls.push(...vehicle.imageUrls);
  } else if (typeof vehicle.imageUrl === "string" && vehicle.imageUrl.trim().length > 0) {
    const parsed = vehicle.imageUrl.split(/[\s,;|]+/).filter((u) => u.startsWith("http"));
    imageUrls.push(...parsed);
  }
  await uploadPhotos(imageUrls);

  log("Form fill complete. Settling...");
  await sleep(1500);

  const filled = results.filter((r) => r.status === "filled").length;
  const failed = results.filter((r) => r.status === "failed");
  const skipped = results.filter((r) => r.status === "skipped").length;
  const failedFields = failed.map((r) => r.field);

  const summary = {
    total: results.length,
    filled,
    failed: failed.length,
    skipped,
    failedFields,
    results,
  };

  const requiredFailed = failedFields.filter((f) => REQUIRED_FIELDS.includes(f));
  if (requiredFailed.length > 0) {
    const msg = "Failed to fill required fields: " + requiredFailed.join(", ");
    log(msg);
    throw new Error(msg);
  }

  log("Done! Summary:", summary);
  return summary;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "PING") {
    sendResponse({ alive: true });
    return;
  }

  if (message.type === "FILL_FORM") {
    log("Received FILL_FORM message");
    fillForm(message.payload)
      .then((summary) => {
        sendResponse({ success: true, summary });
      })
      .catch((err) => {
        log("Form fill error:", err.message);
        sendResponse({ success: false, error: err.message });
      });
    return true;
  }
});

log("Content script loaded on:", window.location.href);
