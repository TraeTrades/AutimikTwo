# Autimik Smart Lister — Implementation Plan

## Goal

Transform Autimik from a Facebook-only auto-lister into a multi-site smart lister that works on ANY vehicle listing site. Use a hybrid approach: hardcoded adapters for top sites (95% reliability) + AI form detection fallback for unknown sites (instant coverage).

---

## Current State

The extension has 4 files in `extension/`:
- `manifest.json` — MV3, v2.0.0
- `content.js` — Facebook-specific form filler (selectors hardcoded)
- `popup/popup.html` + `popup/popup.js` — CSV upload, inventory management, listing UI
- `background/service-worker.js` — storage, tab routing, image proxy

All form-filling logic in `content.js` is tightly coupled to Facebook Marketplace selectors. The refactor decouples the fill engine from site-specific selectors.

---

## Architecture Overview

```
popup.js (unchanged — manages inventory, triggers listing)
    │
    ▼
service-worker.js (updated — routes to correct tab on ANY listing site)
    │
    ▼
content.js (refactored — site detection + adapter/AI routing)
    │
    ├── adapters/facebook.json    ← Tier 1: hardcoded, 95% reliable
    ├── adapters/craigslist.json  ← Tier 1: hardcoded, 95% reliable
    ├── adapters/offerup.json     ← Tier 1: hardcoded, 90% reliable
    │
    ├── form-scanner.js           ← Scans unknown pages for form fields
    ├── ai-mapper.js              ← Sends field snapshot to AI, gets mapping
    ├── mapping-cache.js          ← Caches AI mappings per domain
    │
    └── fill-engine.js            ← Shared fill logic (extracted from current content.js)
```

---

## File-by-File Implementation

### 1. `extension/adapters/facebook.json`

Extract the current hardcoded Facebook selectors into a JSON config. This is a pure refactor — no behavior change.

```json
{
  "id": "facebook_marketplace",
  "name": "Facebook Marketplace",
  "version": 1,
  "match": ["*://www.facebook.com/marketplace/create/vehicle*"],
  "strategy": "react_controlled",
  "fields": {
    "price": {
      "selectors": ["input[aria-label='Price']", "input[placeholder*='Price']", "input[name*='price']"],
      "type": "input",
      "required": true
    },
    "year": {
      "selectors": ["input[aria-label='Year']", "input[placeholder*='Year']"],
      "type": "input",
      "required": true
    },
    "make": {
      "selectors": ["input[aria-label='Make']", "input[placeholder*='Make']"],
      "type": "input",
      "required": true
    },
    "model": {
      "selectors": ["input[aria-label='Model']", "input[placeholder*='Model']"],
      "type": "input",
      "required": true
    },
    "mileage": {
      "selectors": ["input[aria-label='Mileage']", "input[placeholder*='Mileage']", "input[placeholder*='miles']"],
      "type": "input",
      "required": true
    },
    "condition": {
      "selectors": ["[aria-label='Condition']", "[aria-label*='Condition']"],
      "type": "dropdown",
      "default": "Used",
      "valueMap": {
        "new": "New",
        "used": "Used",
        "certified": "Certified pre-owned",
        "cpo": "Certified pre-owned"
      }
    },
    "fuelType": {
      "selectors": ["[aria-label='Fuel type']", "[aria-label*='Fuel']"],
      "type": "dropdown",
      "valueMap": {
        "gas": "Gasoline",
        "gasoline": "Gasoline",
        "diesel": "Diesel",
        "electric": "Electric",
        "hybrid": "Hybrid",
        "flex": "Flex fuel",
        "flex fuel": "Flex fuel"
      }
    },
    "transmission": {
      "selectors": ["[aria-label='Transmission']", "[aria-label*='Transmission']"],
      "type": "dropdown",
      "valueMap": {
        "auto": "Automatic",
        "automatic": "Automatic",
        "manual": "Manual",
        "cvt": "CVT",
        "other": "Other"
      }
    },
    "drivetrain": {
      "selectors": ["[aria-label='Drivetrain']", "[aria-label*='Drivetrain']"],
      "type": "dropdown",
      "valueMap": {
        "fwd": "Front-wheel drive",
        "front-wheel drive": "Front-wheel drive",
        "rwd": "Rear-wheel drive",
        "rear-wheel drive": "Rear-wheel drive",
        "awd": "All-wheel drive",
        "all-wheel drive": "All-wheel drive",
        "4wd": "Four-wheel drive",
        "4x4": "Four-wheel drive",
        "four-wheel drive": "Four-wheel drive"
      }
    },
    "exteriorColor": {
      "selectors": ["[aria-label='Exterior color']", "[aria-label*='Exterior']"],
      "type": "dropdown"
    },
    "interiorColor": {
      "selectors": ["[aria-label='Interior color']", "[aria-label*='Interior']"],
      "type": "dropdown"
    },
    "bodyStyle": {
      "selectors": ["[aria-label='Vehicle type']", "[aria-label*='Vehicle type']"],
      "type": "dropdown",
      "valueMap": {
        "sedan": "Sedan",
        "suv": "SUV",
        "truck": "Truck",
        "coupe": "Coupe",
        "convertible": "Convertible",
        "van": "Van",
        "wagon": "Wagon",
        "hatchback": "Hatchback",
        "minivan": "Minivan"
      }
    },
    "description": {
      "selectors": [
        "textarea[aria-label='Description']",
        "div[role='textbox'][aria-label*='escription']",
        "div[contenteditable='true']"
      ],
      "type": "description"
    }
  },
  "photos": {
    "selectors": ["input[type='file'][accept*='image']"],
    "method": "dataTransfer"
  },
  "timing": {
    "fieldDelay": 400,
    "dropdownWait": 500,
    "settleDelay": 1500
  }
}
```

### 2. `extension/adapters/craigslist.json`

Craigslist uses plain HTML forms — much simpler than Facebook. No React controlled inputs, no dropdowns with `role="option"`. Standard `<select>` elements and `<input>` fields.

```json
{
  "id": "craigslist",
  "name": "Craigslist",
  "version": 1,
  "match": ["*://*.craigslist.org/post*"],
  "strategy": "standard_html",
  "fields": {
    "price": {
      "selectors": ["input[name='price']", "#price"],
      "type": "input",
      "required": true
    },
    "year": {
      "selectors": ["input[name='auto_year']", "#auto_year"],
      "type": "input",
      "required": true
    },
    "make": {
      "selectors": ["input[name='auto_make_model']", "#auto_make_model"],
      "type": "input",
      "note": "Craigslist combines make+model into one field. Concatenate: vehicle.make + ' ' + vehicle.model"
    },
    "mileage": {
      "selectors": ["input[name='auto_miles']", "#auto_miles"],
      "type": "input"
    },
    "condition": {
      "selectors": ["select[name='condition']", "#condition"],
      "type": "select",
      "valueMap": {
        "new": "new",
        "used": "good",
        "excellent": "excellent",
        "good": "good",
        "fair": "fair",
        "salvage": "salvage"
      }
    },
    "fuelType": {
      "selectors": ["select[name='auto_fuel_type']"],
      "type": "select",
      "valueMap": {
        "gas": "gas",
        "gasoline": "gas",
        "diesel": "diesel",
        "electric": "electric",
        "hybrid": "hybrid"
      }
    },
    "transmission": {
      "selectors": ["select[name='auto_transmission']"],
      "type": "select",
      "valueMap": {
        "automatic": "automatic",
        "auto": "automatic",
        "manual": "manual"
      }
    },
    "bodyStyle": {
      "selectors": ["select[name='auto_body_type']"],
      "type": "select"
    },
    "vin": {
      "selectors": ["input[name='auto_vin']"],
      "type": "input"
    },
    "title": {
      "selectors": ["input[name='PostingTitle']", "#PostingTitle"],
      "type": "input",
      "note": "Build from: year + make + model + trim"
    },
    "description": {
      "selectors": ["textarea[name='PostingBody']", "#PostingBody"],
      "type": "description"
    }
  },
  "photos": {
    "selectors": ["input[type='file']"],
    "method": "dataTransfer"
  },
  "timing": {
    "fieldDelay": 100,
    "dropdownWait": 0,
    "settleDelay": 500
  }
}
```

### 3. `extension/adapters/offerup.json`

OfferUp is a React app similar to Facebook. Uses aria-labels and role-based dropdowns. Create/item page for vehicles.

```json
{
  "id": "offerup",
  "name": "OfferUp",
  "version": 1,
  "match": ["*://offerup.com/post*", "*://www.offerup.com/post*"],
  "strategy": "react_controlled",
  "fields": {
    "title": {
      "selectors": ["input[name='title']", "input[aria-label*='Title']", "input[placeholder*='title']"],
      "type": "input",
      "required": true,
      "note": "Build from: year + make + model"
    },
    "price": {
      "selectors": ["input[name='price']", "input[aria-label*='Price']", "input[placeholder*='Price']"],
      "type": "input",
      "required": true
    },
    "description": {
      "selectors": ["textarea[name='description']", "textarea[aria-label*='Description']", "textarea[placeholder*='description']"],
      "type": "description"
    },
    "condition": {
      "selectors": ["[aria-label*='Condition']", "select[name='condition']"],
      "type": "dropdown",
      "valueMap": {
        "new": "New",
        "used": "Used - Good",
        "good": "Used - Good",
        "fair": "Used - Fair",
        "like new": "Used - Like New"
      }
    }
  },
  "photos": {
    "selectors": ["input[type='file'][accept*='image']", "input[type='file']"],
    "method": "dataTransfer"
  },
  "timing": {
    "fieldDelay": 300,
    "dropdownWait": 400,
    "settleDelay": 1000
  }
}
```

### 4. `extension/fill-engine.js`

Extract all fill logic from the current `content.js` into a shared module. This is the core engine that both adapters and AI mappings feed into.

```js
/**
 * fill-engine.js — Shared form-filling primitives
 *
 * Exports:
 *   fillInputField(selectors, value, strategy, retries)
 *   fillDropdownField(selectors, value, valueMap, strategy, retries)
 *   fillDescriptionField(selectors, text, strategy)
 *   uploadPhotos(selectors, imageUrls, method)
 *   setNativeValue(element, value)
 *   waitFor(selectors, timeout)
 *   sleep(ms)
 */

// Move ALL of the following functions from current content.js into this file:
//   - log()
//   - waitFor()
//   - sleep()
//   - setNativeValue()
//   - fillInput()          → rename to fillInputField()
//   - selectDropdown()     → rename to fillDropdownField()
//   - fillDescription()    → rename to fillDescriptionField()
//   - uploadPhotos()
//   - fetchImageViaBackground()
//   - dataUrlToBlob()
//   - buildDescription()
//   - collectImageUrls()

// ADD a new function for standard HTML selects (Craigslist uses <select> not role="listbox"):
async function fillSelectField(selectors, value, valueMap, retries = 3) {
  if (!value) return { field: "select", status: "skipped" };

  // Resolve through valueMap if available
  const mapped = valueMap
    ? valueMap[String(value).toLowerCase().trim()] || value
    : value;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const el = await waitFor(selectors, 6000);
      el.scrollIntoView({ block: "center", behavior: "instant" });
      await sleep(100);

      // Standard HTML <select> — set value directly
      const norm = String(mapped).toLowerCase().trim();
      let matched = false;
      for (const opt of el.options) {
        if (opt.value.toLowerCase() === norm || opt.text.toLowerCase().includes(norm)) {
          el.value = opt.value;
          el.dispatchEvent(new Event("change", { bubbles: true }));
          matched = true;
          break;
        }
      }

      if (matched) return { field: "select", status: "filled", value: mapped };
      if (attempt === retries) return { field: "select", status: "no_match", value };
      await sleep(300);
    } catch (e) {
      if (attempt === retries) return { field: "select", status: "failed", error: e.message };
      await sleep(400);
    }
  }
  return { field: "select", status: "failed", error: "Exhausted retries" };
}

// ADD: Strategy-aware fill dispatcher
// "strategy" comes from the adapter config:
//   "react_controlled" → use setNativeValue (Facebook, OfferUp)
//   "standard_html"    → use el.value = x directly (Craigslist)
//   "ai_detected"      → try setNativeValue first, fall back to standard
async function fillField(el, value, strategy) {
  if (strategy === "standard_html") {
    el.value = String(value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  } else {
    // react_controlled or ai_detected — use native setter
    setNativeValue(el, String(value));
  }
}

// ALSO ADD: Improved verification that handles formatted values
// The current bug: FB formats "24999" as "24,999" and verification fails.
function verifyValue(actual, expected) {
  const normActual = String(actual).replace(/[^0-9a-zA-Z]/g, "").toLowerCase();
  const normExpected = String(expected).replace(/[^0-9a-zA-Z]/g, "").toLowerCase();
  // Check if actual contains expected (handles formatting additions)
  return normActual.includes(normExpected) || normExpected.includes(normActual);
}
```

### 5. `extension/form-scanner.js`

Scans any unknown page for fillable form fields. Used by the AI fallback.

```js
/**
 * form-scanner.js — Scans DOM for all fillable form elements
 *
 * Returns a structured snapshot of the page's form fields
 * that can be sent to an AI for mapping.
 */

function scanFormFields() {
  const elements = document.querySelectorAll(
    'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]), ' +
    'select, ' +
    'textarea, ' +
    '[contenteditable="true"], ' +
    '[role="combobox"], ' +
    '[role="listbox"]'
  );

  const fields = [];

  for (const el of elements) {
    // Skip invisible elements
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) continue;
    const style = window.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") continue;

    const field = {
      index: fields.length,
      tag: el.tagName.toLowerCase(),
      type: el.type || null,
      ariaLabel: el.getAttribute("aria-label") || null,
      placeholder: el.placeholder || null,
      name: el.name || null,
      id: el.id || null,
      label: findAssociatedLabel(el),
      nearbyText: getNearbyText(el),
      currentValue: el.value || el.textContent?.trim() || "",
      // For selects and listboxes, include the available options
      options: getOptions(el),
      // Generate a unique CSS selector for this element
      selector: buildUniqueSelector(el),
    };

    fields.push(field);
  }

  // Also detect file inputs for photo upload
  const fileInputs = document.querySelectorAll('input[type="file"]');
  const photoField = fileInputs.length > 0 ? {
    hasFileInput: true,
    acceptsImages: Array.from(fileInputs).some(f => (f.accept || "").includes("image")),
    selector: buildUniqueSelector(fileInputs[0]),
  } : null;

  return { fields, photoField, url: window.location.href, title: document.title };
}

function findAssociatedLabel(el) {
  // Method 1: <label for="id">
  if (el.id) {
    const label = document.querySelector(`label[for="${el.id}"]`);
    if (label) return label.textContent.trim();
  }
  // Method 2: Wrapping <label>
  const parent = el.closest("label");
  if (parent) {
    const text = parent.textContent.replace(el.value || "", "").trim();
    if (text) return text;
  }
  // Method 3: aria-labelledby
  const labelledBy = el.getAttribute("aria-labelledby");
  if (labelledBy) {
    const refEl = document.getElementById(labelledBy);
    if (refEl) return refEl.textContent.trim();
  }
  return null;
}

function getNearbyText(el) {
  // Get text from previous sibling or parent that might serve as a label
  const prev = el.previousElementSibling;
  if (prev && prev.textContent.trim().length < 50) {
    return prev.textContent.trim();
  }
  const parent = el.parentElement;
  if (parent) {
    const spans = parent.querySelectorAll("span, div, p, label");
    for (const s of spans) {
      if (s !== el && s.textContent.trim().length < 50 && s.textContent.trim().length > 1) {
        return s.textContent.trim();
      }
    }
  }
  return null;
}

function getOptions(el) {
  // Standard <select>
  if (el.tagName === "SELECT") {
    return Array.from(el.options).map(o => ({ value: o.value, text: o.text }));
  }
  // React listbox (check if there's a nearby role="listbox")
  if (el.getAttribute("role") === "combobox" || el.getAttribute("role") === "listbox") {
    const listbox = document.querySelector('[role="listbox"]');
    if (listbox) {
      return Array.from(listbox.querySelectorAll('[role="option"]'))
        .map(o => ({ text: o.textContent.trim() }));
    }
  }
  return null;
}

function buildUniqueSelector(el) {
  // Build the most specific short selector possible
  if (el.id) return `#${CSS.escape(el.id)}`;
  if (el.name) return `${el.tagName.toLowerCase()}[name="${el.name}"]`;
  if (el.getAttribute("aria-label")) {
    return `${el.tagName.toLowerCase()}[aria-label="${el.getAttribute("aria-label")}"]`;
  }
  // Fallback: nth-of-type path
  const path = [];
  let current = el;
  while (current && current !== document.body) {
    const parent = current.parentElement;
    if (!parent) break;
    const siblings = Array.from(parent.children).filter(c => c.tagName === current.tagName);
    const idx = siblings.indexOf(current) + 1;
    path.unshift(`${current.tagName.toLowerCase()}:nth-of-type(${idx})`);
    current = parent;
    if (path.length >= 4) break;
  }
  return path.join(" > ");
}
```

### 6. `extension/ai-mapper.js`

Sends the form snapshot to an AI and gets back a field mapping.

```js
/**
 * ai-mapper.js — AI-powered form field mapping
 *
 * Takes a vehicle object and a form field snapshot,
 * sends to an LLM, gets back a mapping of vehicle fields → form selectors.
 */

// API key is stored in chrome.storage.sync (user provides it in settings)
async function getApiKey() {
  return new Promise(resolve => {
    chrome.storage.sync.get("autimik_api_key", result => {
      resolve(result.autimik_api_key || null);
    });
  });
}

async function aiMapFields(vehicle, formSnapshot) {
  const apiKey = await getApiKey();
  if (!apiKey) {
    throw new Error("AI mapping requires an API key. Add one in Autimik settings.");
  }

  const prompt = buildMappingPrompt(vehicle, formSnapshot);

  // Call the AI API (Anthropic Claude or OpenAI — whichever you prefer)
  // Using Anthropic as the example:
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`AI API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.content[0].text;

  // Parse the JSON mapping from the AI response
  try {
    // Strip markdown code fences if present
    const clean = text.replace(/```json\n?|```/g, "").trim();
    return JSON.parse(clean);
  } catch (e) {
    throw new Error("AI returned invalid mapping: " + e.message);
  }
}

function buildMappingPrompt(vehicle, formSnapshot) {
  return `You are a form-filling assistant. I have a vehicle to list for sale, and I'm on a website with a listing form.

VEHICLE DATA:
${JSON.stringify(vehicle, null, 2)}

FORM FIELDS DETECTED ON PAGE (${formSnapshot.url}):
${JSON.stringify(formSnapshot.fields.map(f => ({
  index: f.index,
  tag: f.tag,
  type: f.type,
  label: f.ariaLabel || f.label || f.placeholder || f.nearbyText || f.name || "(unlabeled)",
  options: f.options ? f.options.map(o => o.text || o.value).slice(0, 15) : null,
  selector: f.selector,
})), null, 2)}

${formSnapshot.photoField ? `PHOTO UPLOAD: File input detected at selector "${formSnapshot.photoField.selector}"` : "NO PHOTO UPLOAD DETECTED"}

TASK: Map the vehicle data to the form fields. For each vehicle property that has a matching form field, return the field index, the selector to use, the value to fill, and the fill type.

For dropdowns/selects with options, pick the closest matching option text.
For combined fields (e.g. a single "Title" field), combine the relevant vehicle properties.
Skip fields that have no matching vehicle data.

Return ONLY valid JSON in this exact format, no other text:
{
  "siteName": "detected site name",
  "strategy": "standard_html" or "react_controlled",
  "mappings": [
    {
      "vehicleField": "price",
      "formFieldIndex": 0,
      "selector": "input[name='price']",
      "value": "24999",
      "fillType": "input"
    },
    {
      "vehicleField": "condition",
      "formFieldIndex": 3,
      "selector": "select[name='condition']",
      "value": "Used - Good",
      "fillType": "select"
    }
  ],
  "description": {
    "selector": "textarea[name='body']",
    "fillType": "description"
  },
  "photos": ${formSnapshot.photoField ? `{ "selector": "${formSnapshot.photoField.selector}" }` : "null"}
}`;
}
```

### 7. `extension/mapping-cache.js`

Caches AI-generated mappings per domain so repeat listings are instant.

```js
/**
 * mapping-cache.js — Cache AI mappings per domain in chrome.storage.local
 *
 * Cache key: "mapping_cache_{hostname}"
 * Entries expire after 7 days (sites redesign).
 */

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

async function getCachedMapping(hostname) {
  return new Promise(resolve => {
    const key = "mapping_cache_" + hostname.replace(/[^a-z0-9.-]/gi, "_");
    chrome.storage.local.get(key, result => {
      const cached = result[key];
      if (!cached) return resolve(null);
      // Check expiry
      if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
        chrome.storage.local.remove(key);
        return resolve(null);
      }
      resolve(cached.mapping);
    });
  });
}

async function setCachedMapping(hostname, mapping) {
  return new Promise(resolve => {
    const key = "mapping_cache_" + hostname.replace(/[^a-z0-9.-]/gi, "_");
    chrome.storage.local.set({
      [key]: { mapping, timestamp: Date.now() }
    }, resolve);
  });
}

async function clearMappingCache() {
  return new Promise(resolve => {
    chrome.storage.local.get(null, items => {
      const cacheKeys = Object.keys(items).filter(k => k.startsWith("mapping_cache_"));
      chrome.storage.local.remove(cacheKeys, resolve);
    });
  });
}
```

### 8. `extension/content.js` (refactored)

The content script becomes the orchestrator. It detects which site it's on, loads the right adapter or falls back to AI, then delegates to the fill engine.

```js
/**
 * content.js — Orchestrator (refactored)
 *
 * 1. Detect current site
 * 2. Load adapter (tier 1) or AI mapping (tier 2)
 * 3. Delegate to fill-engine.js
 *
 * All files (fill-engine.js, form-scanner.js, ai-mapper.js, mapping-cache.js)
 * are loaded as separate scripts via manifest.json content_scripts.
 * Or: bundle them all into content.js during build.
 * Simplest approach for no-build: put everything in one file.
 * For the CLI agent: keep them as separate functions in one content.js file.
 */

// --- Paste/import all functions from:
//     fill-engine.js, form-scanner.js, ai-mapper.js, mapping-cache.js
//     (Since MV3 content scripts can't use ES modules,
//      either bundle or include all in one file.)

// --- Load adapter configs (embed as JS objects or fetch from extension files)
const ADAPTERS = [
  // Paste the contents of facebook.json, craigslist.json, offerup.json here
  // as JS objects, or load them via chrome.runtime.getURL + fetch
];

function findAdapter(url) {
  for (const adapter of ADAPTERS) {
    for (const pattern of adapter.match) {
      // Convert glob pattern to regex
      const regex = new RegExp(
        "^" + pattern.replace(/\*/g, ".*").replace(/\?/g, ".") + "$"
      );
      if (regex.test(url)) return adapter;
    }
  }
  return null;
}

// --- Adapter-based fill ---
async function fillWithAdapter(vehicle, adapter) {
  log("Using adapter:", adapter.name);
  const results = [];
  const strategy = adapter.strategy;
  const timing = adapter.timing || { fieldDelay: 400, dropdownWait: 500, settleDelay: 1500 };

  // Fill each field defined in the adapter
  for (const [vehicleField, config] of Object.entries(adapter.fields)) {
    const value = resolveVehicleValue(vehicle, vehicleField, config);
    if (!value) {
      results.push({ field: vehicleField, status: "skipped" });
      continue;
    }

    let result;
    switch (config.type) {
      case "input":
        result = await fillInputField(config.selectors, value, strategy);
        break;
      case "dropdown":
        result = await fillDropdownField(config.selectors, value, config.valueMap, strategy);
        break;
      case "select":
        result = await fillSelectField(config.selectors, value, config.valueMap);
        break;
      case "description":
        const desc = vehicle.description || buildDescription(vehicle);
        result = await fillDescriptionField(config.selectors, desc, strategy);
        break;
      default:
        result = { field: vehicleField, status: "unknown_type" };
    }

    result.field = vehicleField;
    results.push(result);
    await sleep(timing.fieldDelay);
  }

  // Photos
  if (adapter.photos) {
    const imageUrls = collectImageUrls(vehicle);
    results.push(await uploadPhotos(adapter.photos.selectors, imageUrls));
  }

  await sleep(timing.settleDelay);
  return buildSummary(results, adapter.fields);
}

// --- AI-based fill ---
async function fillWithAI(vehicle) {
  log("No adapter found — using AI form detection");
  const hostname = location.hostname;

  // Check cache first
  let mapping = await getCachedMapping(hostname);

  if (!mapping) {
    log("No cached mapping — scanning form and calling AI...");
    const snapshot = scanFormFields();

    if (snapshot.fields.length === 0) {
      throw new Error("No form fields detected on this page. Navigate to the listing form first.");
    }

    mapping = await aiMapFields(vehicle, snapshot);
    await setCachedMapping(hostname, mapping);
    log("AI mapping cached for", hostname);
  } else {
    log("Using cached mapping for", hostname);
  }

  // Execute the AI-generated mapping
  const results = [];
  const strategy = mapping.strategy || "react_controlled";

  for (const m of mapping.mappings) {
    let result;
    switch (m.fillType) {
      case "input":
        result = await fillInputField([m.selector], m.value, strategy);
        break;
      case "select":
        result = await fillSelectField([m.selector], m.value, null);
        break;
      case "dropdown":
        result = await fillDropdownField([m.selector], m.value, null, strategy);
        break;
      default:
        result = await fillInputField([m.selector], m.value, strategy);
    }
    result.field = m.vehicleField;
    results.push(result);
    await sleep(300);
  }

  // Description
  if (mapping.description) {
    const desc = vehicle.description || buildDescription(vehicle);
    results.push(await fillDescriptionField([mapping.description.selector], desc, strategy));
  }

  // Photos
  if (mapping.photos) {
    const imageUrls = collectImageUrls(vehicle);
    results.push(await uploadPhotos([mapping.photos.selector], imageUrls));
  }

  await sleep(1000);
  return buildSummary(results);
}

// --- Value resolution (handles valueMap + combined fields) ---
function resolveVehicleValue(vehicle, fieldName, config) {
  let raw = vehicle[fieldName];

  // Special case: title = year + make + model
  if (fieldName === "title" && !raw) {
    raw = [vehicle.year, vehicle.make, vehicle.model, vehicle.trim]
      .filter(Boolean).join(" ");
  }

  // Special case: craigslist make = make + model
  if (config.note && config.note.includes("Concatenate") && fieldName === "make") {
    raw = [vehicle.make, vehicle.model].filter(Boolean).join(" ");
  }

  if (!raw) return null;

  // Apply valueMap if present
  if (config.valueMap) {
    const mapped = config.valueMap[String(raw).toLowerCase().trim()];
    if (mapped) return mapped;
  }

  return String(raw);
}

// --- Summary builder ---
function buildSummary(results, adapterFields) {
  const failed = results.filter(r => r.status === "failed");
  const filled = results.filter(r => r.status === "filled");
  const requiredFields = adapterFields
    ? Object.entries(adapterFields).filter(([_, c]) => c.required).map(([k]) => k)
    : ["price", "year", "make", "model"];

  const summary = {
    total: results.length,
    filled: filled.length,
    failed: failed.length,
    skipped: results.filter(r => r.status === "skipped").length,
    failedFields: failed.map(r => r.field),
    results,
  };

  const reqFails = failed.filter(r => requiredFields.includes(r.field));
  if (reqFails.length > 0) {
    summary.error = "Required fields failed: " + reqFails.map(r => r.field).join(", ");
  }

  return summary;
}

// --- Main orchestrator ---
async function fillForm(vehicle) {
  const url = window.location.href;
  log("Fill requested on:", url);

  // Tier 1: Check for known adapter
  const adapter = findAdapter(url);
  if (adapter) {
    return fillWithAdapter(vehicle, adapter);
  }

  // Tier 2: AI detection (with cache)
  return fillWithAI(vehicle);
}

// --- Message listener ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "FILL_FORM") {
    log("Received FILL_FORM");
    fillForm(message.payload)
      .then(summary => {
        if (summary.error) {
          sendResponse({ success: false, error: summary.error, summary });
        } else {
          sendResponse({ success: true, summary });
        }
      })
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }
  if (message.type === "PING") {
    sendResponse({ alive: true });
  }
});

log("Autimik content script loaded on:", window.location.href);
```

---

## Manifest Changes

Update `manifest.json` to run the content script on ALL sites (not just Facebook):

```json
{
  "manifest_version": 3,
  "name": "Autimik - Smart Auto-Lister",
  "version": "3.0.0",
  "description": "Auto-fill vehicle listings on Facebook Marketplace, Craigslist, OfferUp, and any listing site. Import CSV, click List It.",
  "permissions": ["storage", "activeTab", "scripting", "tabs"],
  "host_permissions": ["https://*/*", "http://*/*"],
  "background": {
    "service_worker": "background/service-worker.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "run_at": "document_idle"
    }
  ],
  "action": {
    "default_popup": "popup/popup.html",
    "default_title": "Autimik"
  },
  "icons": {
    "16": "icon-16.png",
    "48": "icon-48.png",
    "128": "icon-128.png",
    "512": "icon-512.png"
  }
}
```

**IMPORTANT:** Running on `<all_urls>` injects the content script on every page. This has Chrome Web Store review implications. Two options:

**Option A (recommended for store):** Keep `content_scripts` restricted to known adapter domains, and use `chrome.scripting.executeScript` from the service worker to inject on-demand for unknown sites when the user clicks "List It". This avoids the `<all_urls>` content script permission.

**Option B (simpler for dev):** Use `<all_urls>` during development. Replace with Option A before store submission.

For Option A, the manifest content_scripts would be:
```json
"content_scripts": [
  {
    "matches": [
      "https://www.facebook.com/marketplace/create/vehicle*",
      "https://*.craigslist.org/post*",
      "https://offerup.com/post*",
      "https://www.offerup.com/post*"
    ],
    "js": ["content.js"],
    "run_at": "document_idle"
  }
]
```

And the service worker's `LIST_VEHICLE` handler injects the content script for unknown sites:
```js
// In service-worker.js, when no adapter matches
await chrome.scripting.executeScript({
  target: { tabId },
  files: ["content.js"],
});
```

---

## Popup Changes

### Update `popup.js`

The popup needs to know it can list on any site now, not just Facebook.

1. **Change the FB-only tab check:**
```js
// BEFORE:
isOnFBPage = tabs[0].url.includes("facebook.com/marketplace/create/vehicle");

// AFTER:
const KNOWN_SITES = [
  { match: "facebook.com/marketplace/create/vehicle", name: "Facebook Marketplace" },
  { match: "craigslist.org/post", name: "Craigslist" },
  { match: "offerup.com/post", name: "OfferUp" },
];
const currentUrl = tabs[0]?.url || "";
const knownSite = KNOWN_SITES.find(s => currentUrl.includes(s.match));
isOnListingSite = !!knownSite || false;
currentSiteName = knownSite ? knownSite.name : "this site";
// Also: allow AI mode on ANY page (treat all pages as potential listing sites)
allowAiMode = !knownSite && currentUrl.startsWith("http");
```

2. **Update the wrong-page warning:**
```js
// BEFORE: "You're not on the Facebook Marketplace vehicle listing page."
// AFTER:
if (!isOnListingSite && !allowAiMode) {
  // Show: "Navigate to a listing site (Facebook Marketplace, Craigslist, OfferUp) or any vehicle listing form."
} else if (allowAiMode) {
  // Show: "Unknown site — AI will auto-detect form fields. Results may vary."
}
```

3. **Update the LIST_VEHICLE message to include target URL context:**
The service worker needs to know where to send the vehicle. Instead of always opening Facebook, it should either use the current tab (if it's a listing site) or ask the user which site to list on.

Add a site selector to the popup header when the user has inventory loaded:
```html
<select id="targetSite">
  <option value="facebook">Facebook Marketplace</option>
  <option value="craigslist">Craigslist</option>
  <option value="offerup">OfferUp</option>
  <option value="current">Current tab (AI mode)</option>
</select>
```

### Update `popup.html`

Add the target site selector and an API key settings section:

```html
<!-- In the header, after the Auto toggle button -->
<select class="header-select" id="targetSite">
  <option value="facebook">FB Marketplace</option>
  <option value="craigslist">Craigslist</option>
  <option value="offerup">OfferUp</option>
  <option value="current">Current tab</option>
</select>

<!-- Add a settings section (hidden by default, toggled by gear icon) -->
<div id="settingsView" class="settings-view hidden">
  <div class="setting-row">
    <label>AI API Key (for unknown sites)</label>
    <input type="password" id="apiKeyInput" placeholder="sk-ant-..." />
    <button id="btnSaveKey">Save</button>
  </div>
  <div class="setting-row">
    <button id="btnClearCache">Clear site cache</button>
  </div>
</div>
```

---

## Service Worker Changes

Update `service-worker.js` to handle multi-site routing:

```js
const SITE_URLS = {
  facebook: "https://www.facebook.com/marketplace/create/vehicle",
  craigslist: "https://post.craigslist.org/",  // redirects to local CL
  offerup: "https://offerup.com/post",
};

// In the LIST_VEHICLE handler:
case "LIST_VEHICLE": {
  const targetSite = payload.targetSite || "facebook";
  const vehicle = payload.vehicle;

  if (targetSite === "current") {
    // Use the currently active tab — for AI mode
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      if (tabs[0]) {
        ensureContentScript(tabs[0].id).then(() => {
          sendFillMessage(tabs[0].id, vehicle, sendResponse);
        });
      } else {
        sendResponse({ success: false, error: "No active tab found" });
      }
    });
  } else {
    const targetUrl = SITE_URLS[targetSite];
    // ... same logic as before but with targetUrl instead of FB_CREATE_URL
  }
  return true;
}
```

Also add a handler for API key storage:
```js
case "SAVE_API_KEY": {
  chrome.storage.sync.set({ autimik_api_key: payload.key }, () => {
    sendResponse({ success: true });
  });
  return true;
}

case "GET_API_KEY": {
  chrome.storage.sync.get("autimik_api_key", result => {
    sendResponse({ success: true, hasKey: !!result.autimik_api_key });
  });
  return true;
}
```

---

## Bug Fixes to Include (from previous analysis)

While implementing the above, also fix these three known bugs:

### Fix 1: Price verification false positive
In `fill-engine.js`, the `verifyValue` function (shown above) should normalize both values by stripping non-alphanumeric characters before comparing. Replace the current check in `fillInputField`:
```js
// BEFORE (buggy):
if (actual.includes(String(value).substring(0, 5)))

// AFTER:
if (verifyValue(actual, value))
```

### Fix 2: Dropdown value mapping
The adapter JSON files above include `valueMap` objects for each dropdown. The `fillDropdownField` function should resolve through the map before searching options:
```js
const resolvedValue = (valueMap && valueMap[String(value).toLowerCase().trim()]) || value;
```

### Fix 3: Popup close resilience
Move the `MARK_LISTED` call into the service worker instead of relying on the popup callback. When the service worker gets a successful FILL_FORM response from the content script, it should immediately mark the vehicle as listed:
```js
// In service-worker.js, inside sendFillMessage:
chrome.tabs.sendMessage(tabId, { type: "FILL_FORM", payload: vehicle }, response => {
  if (response && response.success) {
    // Mark as listed right here, don't wait for popup
    const key = payload.vehicleKey; // passed in from popup
    chrome.storage.local.get("autimik_listed", result => {
      const listed = result.autimik_listed || {};
      listed[key] = { timestamp: Date.now() };
      chrome.storage.local.set({ autimik_listed: listed });
    });
  }
  sendResponse(response);
});
```

---

## Testing Checklist

After implementation, test these scenarios:

- [ ] Facebook Marketplace: full fill with all fields + photos
- [ ] Facebook Marketplace: fill with missing optional fields (no photos, no VIN)
- [ ] Facebook Marketplace: price field shows "24,999" but verification passes
- [ ] Craigslist: full fill with standard HTML selects
- [ ] Craigslist: combined make+model field
- [ ] OfferUp: React-controlled inputs fill correctly
- [ ] Unknown site: AI detection scans fields, returns mapping
- [ ] Unknown site: second listing uses cached mapping (no AI call)
- [ ] Unknown site: cached mapping expires after 7 days
- [ ] Popup site selector: switching target opens correct site
- [ ] AI mode: "Current tab" option works on arbitrary page
- [ ] API key: saved to chrome.storage.sync, survives extension reload
- [ ] No API key: attempting AI mode shows clear error message
- [ ] Popup closes mid-fill: vehicle still gets marked as listed via service worker
- [ ] Content script injection: works on tab that was open before extension install
- [ ] Auto-advance: chains through multiple vehicles on same site
- [ ] CSV re-import: previously listed vehicles (by VIN) still show as listed

---

## Implementation Order

1. **Extract fill-engine.js functions** — pure refactor, no behavior change
2. **Create adapter JSON configs** — Facebook first (validate against existing behavior)
3. **Refactor content.js** — adapter routing, test Facebook still works identically
4. **Add Craigslist adapter** — test on actual Craigslist post form
5. **Add OfferUp adapter** — test on actual OfferUp post form
6. **Add form-scanner.js** — test snapshot output on various sites
7. **Add ai-mapper.js** — test with a real API key on an unknown site
8. **Add mapping-cache.js** — verify caching and expiry
9. **Update popup** — site selector, settings, multi-site awareness
10. **Update service worker** — multi-site routing, listing persistence fix
11. **Update manifest** — version bump, Option A injection strategy
12. **Fix the 3 bugs** — verification, valueMap, popup-close resilience
