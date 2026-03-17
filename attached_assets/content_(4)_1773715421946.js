var ADAPTERS = {
  facebook: {
    "id": "facebook",
    "name": "Facebook Marketplace",
    "version": "2.0.0",
    "match": ["*://www.facebook.com/marketplace/create/vehicle*"],
    "strategy": "react_controlled",
    "timing": {
      "afterField": 200,
      "afterDropdown": 250,
      "afterDescription": 100,
      "afterPhotos": 800,
      "settle": 800,
      "phaseSettle": 800,
      "vehicleTypeSettle": 1200
    },
    "initFields": ["vehicleType"],
    "requiredFields": ["year", "make", "model", "mileage", "price"],
    "optionalFields": ["bodyStyle", "exteriorColor", "interiorColor", "condition", "fuelType", "transmission", "cleanTitle", "description"],
    "fields": {
      "vehicleType": {
        "selector": ["fb-label:Vehicle type", "[aria-label=\"Vehicle type\"]", "[aria-label*=\"Vehicle type\"]"],
        "type": "dropdown",
        "default": "Car/Truck",
        "valueMap": {
          "car": "Car/Truck",
          "truck": "Car/Truck",
          "car/truck": "Car/Truck",
          "cars/trucks": "Car/Truck",
          "cars & trucks": "Car/Truck",
          "motorcycle": "Motorcycle",
          "boat": "Boat",
          "rv": "RV/Camper",
          "camper": "RV/Camper",
          "powersport": "Powersport"
        }
      },
      "year": {
        "selector": ["fb-label:Year", "[aria-label=\"Year\"]", "[aria-label*=\"Year\"]"],
        "type": "dropdown"
      },
      "make": {
        "selector": ["fb-label:Make", "[aria-label=\"Make\"]", "[aria-label*=\"Make\"]"],
        "type": "typeahead"
      },
      "model": {
        "selector": ["fb-label:Model", "input[aria-label=\"Model\"]", "input[placeholder*=\"Model\"]"],
        "type": "input"
      },
      "mileage": {
        "selector": ["fb-label:Mileage", "input[aria-label=\"Mileage\"]", "input[placeholder*=\"Mileage\"]", "input[placeholder*=\"miles\"]"],
        "type": "input"
      },
      "price": {
        "selector": ["fb-label:Price", "input[aria-label=\"Price\"]", "input[placeholder*=\"Price\"]", "input[name*=\"price\"]"],
        "type": "input"
      },
      "bodyStyle": {
        "selector": ["fb-label:Body style", "[aria-label=\"Body style\"]", "[aria-label*=\"Body style\"]"],
        "type": "dropdown",
        "valueMap": {
          "suv": "suv",
          "crossover": "suv",
          "cuv": "suv",
          "truck": "truck",
          "pickup": "truck",
          "pickup truck": "truck",
          "sedan": "sedan",
          "coupe": "coupe",
          "convertible": "convertible",
          "minivan": "minivan",
          "van": "van",
          "wagon": "wagon",
          "hatchback": "hatchback"
        }
      },
      "exteriorColor": {
        "selector": ["fb-label:Exterior color", "[aria-label=\"Exterior color\"]", "[aria-label*=\"Exterior color\"]"],
        "type": "dropdown"
      },
      "interiorColor": {
        "selector": ["fb-label:Interior color", "[aria-label=\"Interior color\"]", "[aria-label*=\"Interior color\"]"],
        "type": "dropdown"
      },
      "condition": {
        "selector": ["fb-label:Vehicle condition", "fb-label:Condition", "[aria-label=\"Vehicle condition\"]", "[aria-label*=\"Vehicle condition\"]", "[aria-label=\"Condition\"]"],
        "type": "dropdown",
        "valueMap": {
          "new": "Excellent",
          "excellent": "Excellent",
          "like new": "Very good",
          "very good": "Very good",
          "cpo": "Very good",
          "certified": "Very good",
          "used - like new": "Very good",
          "used": "Good",
          "good": "Good",
          "used - good": "Good",
          "fair": "Fair",
          "used - fair": "Fair",
          "poor": "Poor"
        },
        "default": "Good"
      },
      "fuelType": {
        "selector": ["fb-label:Fuel type", "[aria-label=\"Fuel type\"]", "[aria-label*=\"Fuel type\"]"],
        "type": "dropdown",
        "valueMap": {
          "gas": "gasoline",
          "unleaded": "gasoline",
          "phev": "plug-in hybrid",
          "plug-in hybrid": "plug-in hybrid",
          "plug in hybrid": "plug-in hybrid",
          "electric": "electric",
          "ev": "electric",
          "diesel": "diesel",
          "hybrid": "hybrid",
          "flex": "flex fuel",
          "flex fuel": "flex fuel",
          "e85": "flex fuel"
        }
      },
      "transmission": {
        "selector": ["fb-label:Transmission", "[aria-label=\"Transmission\"]", "[aria-label*=\"Transmission\"]"],
        "type": "dropdown",
        "valueMap": {
          "auto": "automatic transmission",
          "automatic": "automatic transmission",
          "at": "automatic transmission",
          "manual": "manual transmission",
          "mt": "manual transmission",
          "cvt": "cvt transmission"
        }
      },
      "cleanTitle": {
        "selector": ["fb-label:This vehicle has a clean title", "input[type=\"checkbox\"]"],
        "type": "checkbox",
        "default": true
      },
      "description": {
        "selector": [
          "fb-label:Description",
          "textarea[aria-label=\"Description\"]",
          "[aria-label*=\"Description\"]",
          "div[role=\"textbox\"][aria-label*=\"escription\"]",
          "div[contenteditable=\"true\"]",
          "textarea"
        ],
        "type": "description",
        "maxLength": 4096
      }
    }
  },

  craigslist: {
    "id": "craigslist",
    "name": "Craigslist",
    "version": "1.0.0",
    "match": ["*://*.craigslist.org/post*"],
    "strategy": "standard_html",
    "timing": {
      "afterField": 300,
      "afterDropdown": 200,
      "afterDescription": 200,
      "afterPhotos": 0,
      "settle": 1000
    },
    "fields": {
      "price": {
        "selector": ["input[name=\"price\"]", "input#price", "input[placeholder*=\"price\"]"],
        "type": "input"
      },
      "year": {
        "selector": ["input[name=\"auto_year\"]", "input#auto_year", "select[name=\"auto_year\"]"],
        "type": "input"
      },
      "make": {
        "selector": ["input[name=\"auto_make_model\"]", "input#auto_make_model"],
        "type": "input",
        "composite": ["make", "model"]
      },
      "mileage": {
        "selector": ["input[name=\"auto_miles\"]", "input#auto_miles"],
        "type": "input"
      },
      "condition": {
        "selector": ["select[name=\"condition\"]", "select#condition"],
        "type": "select",
        "valueMap": {
          "new": "new",
          "used": "good",
          "cpo": "like new",
          "certified": "like new",
          "excellent": "excellent",
          "good": "good",
          "fair": "fair",
          "salvage": "salvage"
        },
        "default": "good"
      },
      "fuelType": {
        "selector": ["select[name=\"auto_fuel_type\"]", "select#auto_fuel_type"],
        "type": "select",
        "valueMap": {
          "gas": "gas",
          "unleaded": "gas",
          "diesel": "diesel",
          "hybrid": "hybrid",
          "electric": "electric",
          "ev": "electric"
        }
      },
      "transmission": {
        "selector": ["select[name=\"auto_transmission\"]", "select#auto_transmission"],
        "type": "select",
        "valueMap": {
          "auto": "automatic",
          "automatic": "automatic",
          "at": "automatic",
          "manual": "manual",
          "mt": "manual"
        }
      },
      "drivetrain": {
        "selector": ["select[name=\"auto_drivetrain\"]", "select#auto_drivetrain"],
        "type": "select",
        "valueMap": {
          "awd": "4wd",
          "4wd": "4wd",
          "4x4": "4wd",
          "fwd": "fwd",
          "rwd": "rwd",
          "2wd": "rwd"
        }
      },
      "exteriorColor": {
        "selector": ["select[name=\"auto_paint\"]", "select#auto_paint"],
        "type": "select"
      },
      "bodyStyle": {
        "selector": ["select[name=\"auto_body_type\"]", "select#auto_body_type"],
        "type": "select",
        "valueMap": {
          "suv": "SUV",
          "crossover": "SUV",
          "cuv": "SUV",
          "truck": "pickup",
          "pickup": "pickup",
          "pickup truck": "pickup",
          "sedan": "sedan",
          "coupe": "coupe",
          "convertible": "convertible",
          "minivan": "mini-van",
          "van": "van",
          "wagon": "wagon",
          "hatchback": "hatchback"
        }
      },
      "description": {
        "selector": ["textarea[name=\"PostingBody\"]", "textarea#PostingBody", "textarea"],
        "type": "description"
      }
    }
  },

  offerup: {
    "id": "offerup",
    "name": "OfferUp",
    "version": "1.0.0",
    "match": ["*://offerup.com/post*", "*://www.offerup.com/post*"],
    "strategy": "react_controlled",
    "timing": {
      "afterField": 400,
      "afterDropdown": 300,
      "afterDescription": 200,
      "afterPhotos": 0,
      "settle": 1200
    },
    "fields": {
      "price": {
        "selector": ["input[name=\"price\"]", "input[data-testid=\"price\"]", "input[placeholder*=\"Price\"]", "input[aria-label*=\"Price\"]"],
        "type": "input"
      },
      "title": {
        "selector": ["input[name=\"title\"]", "input[data-testid=\"title\"]", "input[placeholder*=\"Title\"]", "input[aria-label*=\"Title\"]"],
        "type": "input"
      },
      "year": {
        "selector": ["input[name=\"year\"]", "select[name=\"year\"]", "input[aria-label*=\"Year\"]"],
        "type": "input"
      },
      "make": {
        "selector": ["input[name=\"make\"]", "select[name=\"make\"]", "input[aria-label*=\"Make\"]"],
        "type": "input"
      },
      "model": {
        "selector": ["input[name=\"model\"]", "select[name=\"model\"]", "input[aria-label*=\"Model\"]"],
        "type": "input"
      },
      "mileage": {
        "selector": ["input[name=\"mileage\"]", "input[name=\"miles\"]", "input[aria-label*=\"Mileage\"]", "input[placeholder*=\"Mileage\"]"],
        "type": "input"
      },
      "condition": {
        "selector": ["select[name=\"condition\"]", "button[aria-label*=\"Condition\"]", "[data-testid*=\"condition\"]"],
        "type": "dropdown",
        "valueMap": {
          "new": "New",
          "used": "Good",
          "cpo": "Like new",
          "certified": "Like new",
          "excellent": "Like new",
          "good": "Good",
          "fair": "Fair"
        },
        "default": "Good"
      },
      "transmission": {
        "selector": ["select[name=\"transmission\"]", "button[aria-label*=\"Transmission\"]", "[data-testid*=\"transmission\"]"],
        "type": "dropdown",
        "valueMap": {
          "auto": "Automatic",
          "automatic": "Automatic",
          "at": "Automatic",
          "manual": "Manual",
          "mt": "Manual",
          "cvt": "CVT"
        }
      },
      "drivetrain": {
        "selector": ["select[name=\"drivetrain\"]", "button[aria-label*=\"Drivetrain\"]", "[data-testid*=\"drivetrain\"]"],
        "type": "dropdown",
        "valueMap": {
          "awd": "AWD",
          "4wd": "4WD",
          "4x4": "4WD",
          "fwd": "FWD",
          "rwd": "RWD",
          "2wd": "RWD"
        }
      },
      "fuelType": {
        "selector": ["select[name=\"fuelType\"]", "button[aria-label*=\"Fuel\"]", "[data-testid*=\"fuel\"]"],
        "type": "dropdown",
        "valueMap": {
          "gas": "Gasoline",
          "unleaded": "Gasoline",
          "diesel": "Diesel",
          "hybrid": "Hybrid",
          "electric": "Electric",
          "ev": "Electric"
        }
      },
      "description": {
        "selector": ["textarea[name=\"description\"]", "textarea[aria-label*=\"Description\"]", "textarea"],
        "type": "description"
      }
    }
  }
};

function log(...args) {
  console.log("[Autimik]", ...args);
}

function reportStatus(step, detail) {
  try {
    chrome.runtime.sendMessage({ type: "FILL_STATUS", payload: { step: step, detail: detail || "" } });
  } catch (e) { /* popup may be closed */ }
}

function getCustomAdapter(url) {
  return new Promise(function (resolve) {
    var hostname;
    try { hostname = new URL(url).hostname; } catch (e) { return resolve(null); }
    chrome.storage.local.get("autimik_custom_adapters", function (result) {
      var adapters = result.autimik_custom_adapters || {};
      resolve(adapters[hostname] || null);
    });
  });
}

async function findAdapter(url) {
  for (var id in ADAPTERS) {
    var adapter = ADAPTERS[id];
    for (var i = 0; i < adapter.match.length; i++) {
      var pattern = adapter.match[i]
        .replace(/[.+^${}()|[\]\\]/g, "\\$&")
        .replace(/\*/g, ".*");
      if (new RegExp("^" + pattern + "$").test(url)) {
        log("Matched adapter:", adapter.name);
        return adapter;
      }
    }
  }
  var custom = await getCustomAdapter(url);
  if (custom) {
    log("Matched custom trained adapter:", custom.name);
    return custom;
  }
  log("No adapter matched for:", url);
  return null;
}

function resolveVehicleValue(vehicle, fieldName, adapterField) {
  if (adapterField && adapterField.composite) {
    return adapterField.composite.map(function (f) { return vehicle[f] || ""; }).filter(Boolean).join(" ");
  }
  var value = vehicle[fieldName];
  if (!value && fieldName === "vehicleType") {
    value = adapterField && adapterField.default ? adapterField.default : "cars/trucks";
  }
  if (!value && fieldName === "condition") {
    value = adapterField && adapterField.default ? adapterField.default : "used";
  }
  if (!value && fieldName === "title") {
    value = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(" ");
  }
  return value || "";
}

function buildSummary(results) {
  var filled = 0;
  var failed = 0;
  var skipped = 0;
  var failedFields = [];
  for (var i = 0; i < results.length; i++) {
    if (results[i].status === "filled") filled++;
    else if (results[i].status === "failed") {
      failed++;
      failedFields.push(results[i].field);
    }
    else if (results[i].status === "skipped") skipped++;
  }
  return {
    total: results.length,
    filled: filled,
    failed: failed,
    skipped: skipped,
    failedFields: failedFields,
    results: results
  };
}

var REQUIRED_FIELDS = ["price", "year", "make", "model"];

var DEFAULT_REQUIRED_ORDER = ["price", "year", "make", "model", "mileage"];
var DEFAULT_OPTIONAL_ORDER = ["vin", "title", "condition", "fuelType", "transmission",
                              "drivetrain", "exteriorColor", "interiorColor", "bodyStyle", "description"];

async function fillFieldGroup(vehicle, adapter, fieldNames, timeoutOverride) {
  var results = [];
  var timing = adapter.timing || {};
  for (var i = 0; i < fieldNames.length; i++) {
    var fieldName = fieldNames[i];
    var fieldConfig = adapter.fields[fieldName];
    if (!fieldConfig) continue;

    reportStatus("Filling " + fieldName + "...");

    var value = resolveVehicleValue(vehicle, fieldName, fieldConfig);
    if (fieldName === "description" && !value) {
      value = vehicle.description || FillEngine.buildDescription(vehicle);
    }
    // For fields with a default (e.g. cleanTitle checkbox), use it when no CSV value
    if ((value === undefined || value === null || value === "") && fieldConfig.default !== undefined) {
      value = fieldConfig.default;
    }

    var fillTimeout = timeoutOverride;
    if (!fillTimeout) {
      fillTimeout = (fieldConfig.type === "dropdown" || fieldConfig.type === "select" || fieldConfig.type === "typeahead" || fieldConfig.type === "description" || fieldConfig.type === "checkbox") ? 4000 : 8000;
    }

    var result = await FillEngine.fillField(fieldConfig, value, {
      label: fieldName,
      strategy: adapter.strategy,
      afterDelay: fieldConfig.type === "dropdown" ? timing.afterDropdown : timing.afterField,
      timeout: fillTimeout
    });
    results.push(result);

    var delay = fieldConfig.type === "dropdown" || fieldConfig.type === "select"
      ? (timing.afterDropdown || 300)
      : (timing.afterField || 500);
    await FillEngine.sleep(delay);
  }
  return results;
}

async function fillWithAdapter(vehicle, adapter) {
  log("Filling with adapter:", adapter.name);
  var timing = adapter.timing || {};
  var results = [];

  var initOrder = adapter.initFields || [];
  var requiredOrder = adapter.requiredFields || DEFAULT_REQUIRED_ORDER;
  var optionalOrder = adapter.optionalFields || DEFAULT_OPTIONAL_ORDER;

  if (initOrder.length > 0) {
    reportStatus("Initializing form...");
    log("Phase 0: Init fields:", initOrder.join(", "));
    var initResults = await fillFieldGroup(vehicle, adapter, initOrder, 8000);
    results.push.apply(results, initResults);

    var vehicleTypeSettle = timing.vehicleTypeSettle || 2000;
    log("Waiting", vehicleTypeSettle, "ms for form to expand after init...");
    await FillEngine.sleep(vehicleTypeSettle);
  }

  reportStatus("Filling required fields...");
  log("Phase 1: Filling required fields:", requiredOrder.join(", "));
  var requiredResults = await fillFieldGroup(vehicle, adapter, requiredOrder, 8000);
  results.push.apply(results, requiredResults);

  var phaseSettle = timing.phaseSettle || 1000;
  log("Waiting", phaseSettle, "ms for form to settle before optional fields...");
  await FillEngine.sleep(phaseSettle);

  reportStatus("Filling optional fields...");
  log("Phase 2: Filling optional fields:", optionalOrder.join(", "));
  var optionalResults = await fillFieldGroup(vehicle, adapter, optionalOrder, 4000);
  results.push.apply(results, optionalResults);

  var imageUrls = FillEngine.collectImageUrls(vehicle);
  if (imageUrls.length > 0) {
    reportStatus("Uploading photos...");
    var photoResult = await FillEngine.uploadPhotos(imageUrls, adapter.photos);
    results.push(photoResult);
    if (timing.afterPhotos) await FillEngine.sleep(timing.afterPhotos);
  }

  reportStatus("Almost done...");
  log("Form fill complete. Settling...");
  await FillEngine.sleep(timing.settle || 1500);

  return buildSummary(results);
}

async function fillWithAI(vehicle) {
  log("No adapter found, attempting AI-powered form detection...");

  var cachedMapping = await MappingCache.get(window.location.href);
  var mapping;

  if (cachedMapping) {
    log("Using cached AI mapping");
    mapping = cachedMapping;
  } else {
    var snapshot = FormScanner.scanPage();
    if (snapshot.elements.length === 0) {
      throw new Error("No fillable form elements found on this page");
    }
    mapping = await AIMapper.generateMapping(snapshot, vehicle);
    await MappingCache.set(window.location.href, mapping);
  }

  var results = [];
  for (var i = 0; i < mapping.length; i++) {
    var map = mapping[i];
    var value = vehicle[map.vehicleField];
    if (map.vehicleField === "description" && !value) {
      value = FillEngine.buildDescription(vehicle);
    }
    if (!value) {
      results.push({ field: map.vehicleField, status: "skipped" });
      continue;
    }

    var fieldConfig = {
      selector: [map.selector],
      type: map.type || "input",
      valueMap: map.valueMap
    };
    var result = await FillEngine.fillField(fieldConfig, value, { label: map.vehicleField });
    results.push(result);
    await FillEngine.sleep(400);
  }

  var imageUrls = FillEngine.collectImageUrls(vehicle);
  if (imageUrls.length > 0) {
    var photoResult = await FillEngine.uploadPhotos(imageUrls);
    results.push(photoResult);
  }

  log("AI form fill complete. Settling...");
  await FillEngine.sleep(1200);

  return buildSummary(results);
}

async function getSignature() {
  return new Promise(function (resolve) {
    chrome.storage.sync.get("autimik_signature", function (result) {
      resolve(result.autimik_signature || "");
    });
  });
}

async function fillForm(vehicle) {
  log("Starting form fill for:", vehicle.year, vehicle.make, vehicle.model);

  // Append signature to description
  var signature = await getSignature();
  if (signature) {
    var base = vehicle.description || FillEngine.buildDescription(vehicle);
    vehicle = Object.assign({}, vehicle, {
      description: base + "\n\n" + signature
    });
  }

  var adapter = await findAdapter(window.location.href);
  var summary;

  if (adapter) {
    summary = await fillWithAdapter(vehicle, adapter);
  } else {
    summary = await fillWithAI(vehicle);
  }

  var criticalFields = REQUIRED_FIELDS;
  if (adapter) {
    criticalFields = (adapter.initFields || []).concat(adapter.requiredFields || REQUIRED_FIELDS);
  }

  var requiredFailed = summary.failedFields.filter(function (f) {
    return criticalFields.indexOf(f) !== -1;
  });
  if (requiredFailed.length > 0) {
    var msg = "Failed to fill required fields: " + requiredFailed.join(", ");
    log(msg);
    throw new Error(msg);
  }

  log("Done! Summary:", summary);
  return summary;
}

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message.type === "PING") {
    sendResponse({ alive: true });
    return;
  }

  if (message.type === "START_TRAINING" || message.type === "STOP_TRAINING") {
    // Forwarded to trainer.js via its own listener — nothing to do here
    return;
  }

  if (message.type === "FILL_FORM") {
    log("Received FILL_FORM message");
    fillForm(message.payload)
      .then(function (summary) {
        sendResponse({ success: true, summary: summary });
      })
      .catch(function (err) {
        log("Form fill error:", err.message);
        sendResponse({ success: false, error: err.message });
      });
    return true;
  }
});

log("Content script loaded on:", window.location.href);
