function log(...args) {
  console.log("[Autimik]", ...args);
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
  if (!value) {
    log("Skipping empty value for:", label);
    return true;
  }
  const selectors = [
    `input[aria-label="${label}"]`,
    `textarea[aria-label="${label}"]`,
    ...(fallbackSelectors || []),
  ];
  try {
    const el = await waitFor(selectors);
    log("Filling", label, "with:", value);
    el.focus();
    setNativeValue(el, String(value));
    el.blur();
    log("Filled", label, "successfully");
    return true;
  } catch (e) {
    log("FAILED to fill", label, ":", e.message);
    return false;
  }
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
    await new Promise((r) => setTimeout(r, 400));

    const normalizedValue = String(value).toLowerCase().trim();
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
    await new Promise((r) => setTimeout(r, 300));
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
      el.textContent = text;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }
    log("Description filled");
  } catch (e) {
    log("Could not fill description:", e.message);
  }
}

async function uploadPhotos(imageUrls) {
  if (!imageUrls || imageUrls.length === 0) {
    log("No images to upload");
    return;
  }
  try {
    const fileInput = await waitFor(['input[type="file"][accept*="image"]']);
    log("Found file input, fetching", imageUrls.length, "images");
    const files = [];
    for (const url of imageUrls) {
      try {
        log("Fetching image:", url);
        const response = await fetch(url);
        const blob = await response.blob();
        const fileName = url.split("/").pop() || "vehicle.jpg";
        const file = new File([blob], fileName, { type: blob.type || "image/jpeg" });
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

async function fillForm(vehicle) {
  log("Starting form fill for:", vehicle.year, vehicle.make, vehicle.model);
  const failures = [];

  const priceOk = await fillInput("Price", vehicle.price, [
    'input[placeholder*="Price"]',
    'input[name*="price"]',
  ]);
  if (!priceOk) failures.push("Price");
  await new Promise((r) => setTimeout(r, 500));

  const yearOk = await fillInput("Year", vehicle.year, ['input[placeholder*="Year"]']);
  if (!yearOk) failures.push("Year");
  await new Promise((r) => setTimeout(r, 500));

  const makeOk = await fillInput("Make", vehicle.make, ['input[placeholder*="Make"]']);
  if (!makeOk) failures.push("Make");
  await new Promise((r) => setTimeout(r, 500));

  const modelOk = await fillInput("Model", vehicle.model, ['input[placeholder*="Model"]']);
  if (!modelOk) failures.push("Model");
  await new Promise((r) => setTimeout(r, 500));

  const mileageOk = await fillInput("Mileage", vehicle.mileage, [
    'input[placeholder*="Mileage"]',
    'input[placeholder*="miles"]',
  ]);
  if (!mileageOk) failures.push("Mileage");
  await new Promise((r) => setTimeout(r, 500));

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
  if (vehicle.imageUrls && vehicle.imageUrls.length > 0) {
    imageUrls.push(...vehicle.imageUrls);
  } else if (vehicle.imageUrl) {
    imageUrls.push(vehicle.imageUrl);
  }
  await uploadPhotos(imageUrls);

  log("Form fill complete. Waiting 10 seconds before signaling done...");
  await new Promise((r) => setTimeout(r, 10000));

  if (failures.length > 0) {
    const msg = "Failed to fill required fields: " + failures.join(", ");
    log(msg);
    throw new Error(msg);
  }

  log("Done! All required fields filled successfully.");
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "FILL_FORM") {
    log("Received FILL_FORM message");
    fillForm(message.payload)
      .then(() => {
        sendResponse({ success: true });
      })
      .catch((err) => {
        log("Form fill error:", err.message);
        sendResponse({ success: false, error: err.message });
      });
    return true;
  }
});

log("Content script loaded on:", window.location.href);
